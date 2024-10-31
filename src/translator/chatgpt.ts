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
          try {
            if (err) {
              return obs.error(err);
            }

            if (res.statusCode === 200) {
              const content = resBody.choices.find(item => item.message.role === 'assistant')!.message.content;
              const result = this.parseTranslation(content);
              if (this.validTranslatedResult(texts, result)) {
                obs.next(result);
              } else {
                obs.error(new Error(`ChatGPT(${this.model}) Translation Error: 翻译结果不正确 -》 ${content}`));
              }
            } else {
              obs.error(new Error(`ChatGPT(${this.model}) Translation Error: ${res.body.message}`));
            }
          } finally {
            obs.complete();
          }
        }
      );
      return () => obs.complete();
    });
  }

  private parseTranslation(text: string): string[] {
    // gpt 输出的内容不稳定 会存在以下几种情况
    // - ['hello', 'world]
    // - ['hello', 'world'].
    // - ['hello', 'world']
    try {
      const start = text.indexOf('[');
      const end = text.indexOf(']');
      if (start === -1 || start > end) {
        return [];
      }
      return JSON.parse(text.slice(start, end));
    } catch (e) {}
    return [];
  }

  private validTranslatedResult(source: string[], translation: string[]): boolean {
    return source.length === translation.length;
  }

  private buildBody(target: string, texts: string[]) {
    return {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: `I want you to act as a Master of Translation for converting texts into different languages based on specified formats. 
          Given a text with placeholders $$1 and $$2, you are required to translate it into the specified language and format it as a serializable array string. 
          For example: 
          1. Translate into French "['Bonjour $$1', 'amis']" You will return "['Salut $$1', 'copains']" 
          2. Translate into Spanish "['$$1 días después', '$$2']" You will return "['$$1 days later', '$$2']"
          ==================================================================================================
          Translate into ${target}  ${JSON.stringify(texts)}`,
        },
      ],
    };
  }
}
