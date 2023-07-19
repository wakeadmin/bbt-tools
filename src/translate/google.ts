import {
  Observable,
  map,
  of,
  from,
  bufferCount,
  concatMap,
  delay,
  mergeMap,
  filter,
  retry,
  timer,
  catchError,
} from 'rxjs';
import { teenyRequest } from 'teeny-request';
import { error } from 'log-symbols';
import { BaseTranslator, TranslatedList } from './base';

export class GoogleTranslator extends BaseTranslator {
  private readonly key: string;
  readonly proxy?: string;
  private readonly concurrent = 10;
  private readonly delayTime = 200;

  constructor(key?: string, proxy?: string) {
    super();
    if (!key) {
      throw new Error(`${error} Google Translation Error: 缺少 API key`);
    }
    this.key = key;
    this.proxy = proxy;
  }

  override translate<T extends string>(
    record: Record<string, string>,
    target: T,
    sourceLanguage?: string
  ): Observable<TranslatedList> {
    return from(Object.entries(record)).pipe(
      map(([key, value]) => {
        const str = this.replaceInterpolation(key, value);
        return [key, str];
      }),
      // 每次处理50个
      bufferCount(50),
      // 每次延迟200ms
      concatMap(list => of(list).pipe(delay(this.delayTime))),
      // 转换数据结构
      map(list =>
        list.reduce<{ keys: string[]; texts: string[] }>(
          (obj, [key, text]) => {
            obj.keys.push(key);
            obj.texts.push(text);
            return obj;
          },
          { keys: [], texts: [] }
        )
      ),
      // 进行翻译
      mergeMap(({ texts, keys }) => {
        return this.translateTexts(texts, target).pipe(
          /**
           * 失败之后进行重试
           * 最多三次
           * 指数性重试
           */
          retry({
            count: 3,
            delay: (_, retryCount) => timer(2 ** retryCount * this.delayTime),
          }),
          /**
           * 三次都失败了话 写入日志
           * 进行回退 直接返回一个null
           */
          catchError(err => {
            this.writeErrorLog(`Google Translation Error : ${err.message}`, target, texts, keys);
            return of(null);
          }),
          filter(Boolean),
          map(({ translatedText }) =>
            translatedText.map((text, i) => {
              const key = keys[i];
              return { target, translatedText: this.reductionInterpolation(key, text), key };
            })
          )
        );
      }, this.concurrent)
    );
  }

  private translateTexts(texts: string[], target: string): Observable<{ target: string; translatedText: string[] }> {
    return this.createRequest(texts, target).pipe(
      map(translations => ({
        target,
        translatedText: translations.map(translation => translation.translatedText),
      }))
    );
  }

  private createRequest(
    texts: string[],
    target: string
  ): Observable<
    {
      detectedSourceLanguage: string;
      translatedText: string;
    }[]
  > {
    return new Observable(obs => {
      teenyRequest(
        {
          uri: 'https://translation.googleapis.com/language/translate/v2',
          method: 'POST',
          json: {
            q: texts,
            target,
            format: 'text',
          },
          qs: {
            key: this.key,
          },
          proxy: this.proxy,
        },
        (err, _, body) => {
          if (err) {
            obs.error(err);
            return obs.complete();
          }
          try {
            const res = JSON.parse(body);
            obs.next(res.data.translations);
          } catch (e) {
            obs.error(new Error(`Google Translation Error: 响应数据不正确 -> ${body}`));
          }

          obs.complete();
        }
      );
      return () => obs.complete();
    });
  }
}
