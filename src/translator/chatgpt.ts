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
import { URL } from 'url';

export enum ChatGPTModel {
  'gpt4' = 'gpt-4',
  'gpt3.5' = 'gpt-3.5-turbo',
}

export class ChatGPTTranslator extends BaseTranslator {
  private readonly key: string;
  private readonly proxy?: string;

  private readonly url: string;

  private model: ChatGPTModel = ChatGPTModel['gpt3.5'];

  constructor(
    key: string,
    config: {
      proxy?: string;
      baseUrl?: string;
    } = {}
  ) {
    super();
    if (!key) {
      throw new Error(`${error} ChatGPT Translation Error: 缺少 API key`);
    }
    this.key = key;
    this.proxy = config.proxy;
    this.url = new URL('v1/chat/completions', config.baseUrl || 'https://api.openai.com').href;
  }

  useModel(model: ChatGPTModel): void {
    this.model = model;
  }

  override translate<T extends string>(record: Record<string, string>, target: T): Observable<TranslatedList> {
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
        return this.createRequest(texts, target).pipe(
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
            this.writeErrorLog(`ChatGPT(${this.model}) Translation Error : ${err.message}`, target, texts, keys);
            return of(null);
          }),
          filter(Boolean),
          map(list =>
            list.map((text, i) => {
              const key = keys[i];
              return { target, translatedText: this.reductionInterpolation(key, text), key };
            })
          )
        );
      }, this.concurrent)
    );
  }

  private createRequest(texts: string[], target: string): Observable<string[]> {
    const body = this.buildBody(target, texts);

    return new Observable(obs => {
      teenyRequest(
        {
          uri: this.url,

          method: 'POST',
          body: JSON.stringify(body),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer  ${this.key}`,
          },
          proxy: this.proxy,
        },
        (
          err,
          res,
          resBody: {
            choices: {
              index: number;
              message: { content: string; role: 'system' | 'user' | 'assistant' | 'function' };
            }[];
          }
        ) => {
          if (err) {
            obs.error(err);
            return obs.complete();
          }
          if (res.statusCode !== 200) {
            obs.error(new Error(`ChatGPT(${this.model}) Translation Error: ${res.body.message}`));
          } else {
            obs.next(JSON.parse(resBody.choices.find(item => item.message.role === 'assistant')!.message.content));
          }

          obs.complete();
        }
      );
      return () => obs.complete();
    });
  }

  private buildBody(target: string, texts: string[]) {
    return {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: `Translate the following content into ${target}, where $$1 is a placeholder and is not to be translated. Please directly output the translation result.
      ${JSON.stringify(texts)}
      `,
        },
      ],
    };
  }
}
