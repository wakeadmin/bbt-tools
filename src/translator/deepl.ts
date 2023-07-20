import { error } from 'log-symbols';
import { Observable, map } from 'rxjs';
import { teenyRequest } from 'teeny-request';
import { BaseTranslator } from './base';

export class DeepLTranslator extends BaseTranslator {
  private readonly key: string;
  private readonly proxy?: string;
  private readonly url: string;
  name = 'DeepL';

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

    this.url = new URL('v2/translate', config.baseUrl || 'https://api-free.deepl.com').href;
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
    const body = new URLSearchParams();
    body.append('target_lang', target);
    texts.forEach(text => body.append('text', text));
    return new Observable(obs => {
      teenyRequest(
        {
          uri: this.url,
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
