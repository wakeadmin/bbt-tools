import { error } from 'log-symbols';
import { Observable } from 'rxjs';
import { teenyRequest } from 'teeny-request';
import { URL } from 'url';
import { BaseTranslator } from './base';

export enum ChatGPTModel {
  'gpt4' = 'gpt-4',
  'gpt3.5' = 'gpt-3.5-turbo',
}

export class ChatGPTTranslator extends BaseTranslator {
  private readonly key: string;
  private readonly proxy?: string;

  private readonly url: string;

  private model: ChatGPTModel = ChatGPTModel['gpt3.5'];

  name = 'ChatGPT';

  constructor(
    key: string,
    config: {
      proxy?: string;
      baseUrl?: string;
    } = {}
  ) {
    super();
    if (!key) {
      throw new Error(`${error} - ${this.name} Translation Error: 缺少 API key`);
    }
    this.key = key;
    this.proxy = config.proxy;
    this.url = new URL('v1/chat/completions', config.baseUrl || 'https://api.openai.com').href;
  }

  useModel(model: ChatGPTModel): void {
    this.model = model;
  }

  translateTexts(texts: string[], target: string): Observable<string[]> {
    return this.createRequest(texts, target);
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
