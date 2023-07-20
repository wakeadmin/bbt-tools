import { error } from 'log-symbols';
import { Observable, map } from 'rxjs';
import { teenyRequest } from 'teeny-request';
import { BaseTranslator } from './base';

export class GoogleTranslator extends BaseTranslator {
  private readonly key: string;
  readonly proxy?: string;
  private readonly url: string;
  name = 'Google';

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

    this.url = new URL('language/translate/v2', config.baseUrl || 'https://translation.googleapis.com').href;
  }

  translateTexts(texts: string[], target: string): Observable<string[]> {
    return this.createRequest(texts, target).pipe(
      map(translations => translations.map(translation => translation.translatedText))
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
          uri: this.url,
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
