import { createWriteStream, WriteStream } from 'fs-extra';
import { Observable } from 'rxjs';
import path from 'path';

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
const RegList = [
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
export class BaseTranslator implements ITranslator {
  private interpolationReplaceMap: Map<string, string[]> = new Map();

  private readonly replaceReg = new RegExp(RegList.map(reg => reg.source).join('|'), 'g');

  private readonly reductionReg = /\$\$(\d+)/g;
  protected logStream?: WriteStream;
  /**
   * @virtual
   */
  translate(
    record: Record<string, string | string[]>,
    targets: string,
    sourceLanguage?: string
  ): Observable<TranslatedList> {
    throw new Error('BaseTranslation 没有实现 translateText');
  }

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
    let i = 0;
    const result = str.replace(this.replaceReg, replaceValue => {
      const val = `$$${i++}`;
      arr.push(replaceValue);
      return val;
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
      return str.replace(this.reductionReg, (_, i) => arr[i]);
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
