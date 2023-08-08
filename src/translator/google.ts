import { error } from 'log-symbols';
import { Observable, map, from, mergeMap, delay } from 'rxjs';
import { teenyRequest } from 'teeny-request';
import { BaseTranslator } from './base';

export const FREE_GOOGLE_KEY = 'Free';
export class GoogleTranslator extends BaseTranslator {
  private readonly key: string;
  readonly proxy?: string;
  protected url: string;
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

  translateTexts(texts: string[], target: string, source: string): Observable<string[]> {
    return this.createRequest(texts, target, source).pipe(
      map(translations => translations.map(translation => translation.translatedText))
    );
  }

  protected createRequest(
    texts: string[],
    target: string,
    source: string
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

export class FreeGoogleTranslator extends GoogleTranslator {
  concurrent = 1;
  constructor(
    config: {
      proxy?: string;
      baseUrl?: string;
    } = {}
  ) {
    super(FREE_GOOGLE_KEY, config);

    this.url = new URL('/translate_a/single', config.baseUrl || 'https:///translate.googleapis.com').href;
  }

  translateTexts(texts: string[], target: string, source: string): Observable<string[]> {
    return from(texts).pipe(
      mergeMap(
        text =>
          this.createRequest([text], target, source).pipe(
            delay(~~(Math.random() * this.delayTime)),
            map(item => [item[0].translatedText])
          ),
        6
      )
    );
  }

  override createRequest(
    texts: [string],
    target: string,
    source: string
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
          method: 'GET',
          qs: {
            client: 'gtx',
            sl: source,
            tl: target,
            hl: 'zh-CN',
            dt: ['t', 'bd'],
            ie: 'UTF-8',
            oe: 'UTF-8',
            dj: '1',
            source: 'icon',
            q: texts[0],
          },
          proxy: this.proxy,
        },
        (err, _, body) => {
          if (err) {
            obs.error(err);
            return obs.complete();
          }
          try {
            const translatedText = body.sentences?.[0].trans ?? body.dict[0].terms[0];
            obs.next([{ translatedText, detectedSourceLanguage: body.src }]);
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
