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

export class DeepLTranslator extends BaseTranslator {
  private readonly key: string;
  readonly proxy?: string;
  private readonly concurrent = 6;
  private readonly delayTime = 200;

  constructor(key?: string, proxy?: string) {
    super();
    if (!key) {
      throw new Error(`${error} DeepL Translation Error: 缺少 API key`);
    }
    this.key = key;
    this.proxy = proxy;
  }

  override translate<T extends string>(
    record: Record<string, string>,
    target: T,
    sourceLanguage?: string
  ): Observable<TranslatedList<T>> {
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
            this.writeErrorLog(`DeepL Translation Error : ${err.message}`, target, texts, keys);
            return of(null);
          }),
          filter(Boolean),
          map(({ translatedText }) => {
            return translatedText.reduce<TranslatedList<T>>((list, text, i) => {
              const key = keys[i];
              list.push({
                target,
                translatedText: this.reductionInterpolation(key, text),
                key,
              });
              return list;
            }, []);
          })
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
    const body = new URLSearchParams();
    body.append('target_lang', target);
    texts.forEach(text => body.append('text', text));
    return new Observable(obs => {
      teenyRequest(
        {
          uri: 'https://api-free.deepl.com/v2/translate',
          method: 'POST',
          body: body.toString(),
          headers: {
            'content-type': `application/x-www-form-urlencoded`,

            Authorization: `DeepL-Auth-Key ${this.key}`,
          },
          proxy: this.proxy,
        },
        (err, res, resBody: { translations: [{ detected_source_language: string; text: string }] }) => {
          if (err) {
            obs.error(err);
            return obs.complete();
          }
          if (res.statusCode !== 200) {
            obs.error(new Error(`DeepL Translation Error: ${res.body.message}`));
          } else {
            const list = resBody.translations.map(({ detected_source_language, text }) => ({
              detectedSourceLanguage: detected_source_language,
              translatedText: text,
            }));
            obs.next(list);
          }

          obs.complete();
        }
      );
      return () => obs.complete();
    });
  }
}
