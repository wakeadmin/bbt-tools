import { createWriteStream, WriteStream } from 'fs-extra';
import path from 'path';
import {
  bufferCount,
  catchError,
  concatMap,
  delay,
  filter,
  from,
  map,
  mergeMap,
  Observable,
  of,
  retry,
  timer,
} from 'rxjs';
import { BBTPlugins } from '../plugins';
import { InterpolationMapFn } from '../utils';

export interface ITranslator {
  /**
   *
   * @param source 要翻译的数据
   * @param target 翻译的目标语言
   * @param sourceLanguage 数据原本的语言
   * @returns
   */
  translate(
    record: Record<string, string | string[]>,
    target: string,
    sourceLanguage?: string
  ): Observable<TranslatedList>;
}

export type TranslatedList = {
  target: string;
  translatedText: string;
  key: string;
}[];

export abstract class TranslatorAdapter implements ITranslator {
  abstract translate<T extends string>(
    record: Record<string, string>,
    targets: T,
    sourceLanguage?: string
  ): Observable<TranslatedList>;
}

/**
 * 处理插值表达式的正则
 */
export const InterpolationRegList = [
  /**
   * 匹配以下字符
   * {axx.xx}
   * {axxx}
   * {xxx, localizedDatetime}
   * {xxx, localizedDatetime(xxx)}
   **/
  /(?<!\\){\s*(\w+\.)*?\w+\s*(,\s*localizedDatetime(\([^)]*\))?)?\s*}/g,
  /(?<!\\)@:\((\w+\.)*?\w+\)/g /** @:(s.ss.v) */,
  /(?<!\\)@:(\w+\.)*?\w+/g /** @:s.ss.v */,
  /(?<!\\)\$t\((\w+\.)*?\w+\)/g /** $t(s.ss.c) */,
  /(?<!\\)<\s*[a-zA-Z0-9]+\s*>/g /** <0> 或者 <xxxx>  */,
];

function getInterpolationReplaceMap(): InterpolationMapFn {
  const plugin = BBTPlugins.get('interpolationMap');
  if (plugin) {
    return plugin.interpolationMap!;
  }
  return fn => {
    let i = 0;
    fn(() => `$$${i++}`);
  };
}

export abstract class BaseTranslator extends TranslatorAdapter {
  protected concurrent = 6;
  protected delayTime = 332;
  /**
   * 每次处理的文本条数
   */
  protected bufferCount = 50;

  private interpolationPlugin = getInterpolationReplaceMap();

  private interpolationReplaceMap: Map<string, string[]> = new Map();

  private readonly replaceReg = new RegExp(InterpolationRegList.map(reg => reg.source).join('|'), 'g');

  private readonly reductionReg = /\$\$(\d+)/g;
  protected logStream?: WriteStream;

  abstract get name(): string;

  translate(record: Record<string, string>, target: string, sourceLanguage: string): Observable<TranslatedList> {
    return from(Object.entries(record)).pipe(
      filter(([_, value]) => !!value),
      map(([key, value]) => {
        const str = this.replaceInterpolation(key, value);
        return [key, str];
      }),

      bufferCount(this.bufferCount),
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
        return this.translateTexts(texts, target, sourceLanguage).pipe(
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
            this.writeErrorLog(`${this.name} Translation Error : ${err.message}`, target, texts, keys);
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

  abstract translateTexts(texts: string[], target: string, sourceLanguage: string): Observable<string[]>;

  /**
   * 替换文字里的插值表达式
   * @param key
   * @param str
   * @public
   */
  protected replaceInterpolation(key: string, str: string): string {
    if (!str) {
      return '';
    }
    const arr: string[] = [];
    let result = str;
    this.interpolationPlugin((replaceFn, reg) => {
      result = result.replace(reg || this.replaceReg, replaceValue => {
        const val = replaceFn(replaceValue);
        arr.push(replaceValue);
        arr.push(val);
        console.log(replaceValue, val);
        return val;
      });
    });

    if (arr.length > 0) {
      this.interpolationReplaceMap.set(key, arr);
    }
    return result;
  }

  /**
   * 还原文字里的插值表达式
   * @param key
   * @param str
   * @public
   */
  protected reductionInterpolation(key: string, str: string): string {
    if (this.interpolationReplaceMap.has(key)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const arr = this.interpolationReplaceMap.get(key)!;
      let result = str;
      for (let i = 0; i < arr.length; i += 2) {
        result = result.replace(arr[i + 1], arr[i]);
      }
      return result;
    } else {
      return str;
    }
  }

  protected writeErrorLog(message: string, target: string, texts: string[], keys: string[]): void {
    if (!this.logStream) {
      this.logStream = createWriteStream(
        path.join(process.cwd(), `./bbt-translate-error-${new Date().toLocaleDateString('zh').replace(/\//g, '-')}.log`)
      );
    }
    this.logStream.write(message + '\n');
    this.logStream.write(`target: ${target}\n`);
    for (let i = 0; i < texts.length; i++) {
      this.logStream.write(`key: ${keys[i]} - text: ${texts[i]}\n`);
    }
  }
}
