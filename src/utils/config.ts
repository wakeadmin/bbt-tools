import fse from 'fs-extra';
import { resolve } from 'path';
import { type Observable } from 'rxjs';

import { ExistedFileError, NotFileError } from '../error';
import { TranslatedList } from '../translator';
import { DiffModeEnum } from './diffTree';
import { FileParser } from './parser';
import { KeyTree } from './keyTree';
import { IBBTValue } from './treeExcel';
import { type BaseAction } from '../cli/baseAction';


/**
 * @param replaceFn 替换函数
 * @param reg 自定义正则
 */
type MapFn = (replaceFn: (str: string) => string, reg?: RegExp) => void
export type InterpolationMapFn = (fn: MapFn) => void;

export interface IBBTProjectConfig {
  /**
   *  支持的语言列表
   */
  langs: string[];
  /**
   * 生成的资源目录地址
   */
  resourcePath: string;
  /**
   * 文件匹配正则
   */
  test: string;
  /**
   *  在那个文件夹下收集语言信息
   */
  src: string;
  /**
   * 忽略的文件夹 类型为正则表达式字符串
   */
  exclude: string[];
  /**
   * excel 的输出地址
   */
  bbtExcelPath: string;
  /**
   * 对比规则
   * - strict  如果基准值不一致 那么修改其基准值 并清空其他值
   * - relaxed 直接进行合并操作
   */
  diffMode: DiffModeEnum;
  /**
   * 输出文件的后缀
   */
  outFileExtName: string;

  plugins?: {
    // /**
    //  * 获取文件列表
    //  * @param config
    //  * @param getOriginalResult  获取内置的文件收集结果
    //  * @returns {}
    //  */
    // collectFile?: (
    //   config: Pick<BBTConfig, 'exclude' | 'test' | 'src'>,
    //   getOriginalResult: () => Promise<string[]>
    // ) => Promise<string[]>;
    // /**
    //  * 将国际化信息写入到文件中
    //  * @param obj
    //  * @returns
    //  * @alpha
    //  */
    // save?: (obj: LangRecord) => Promise<void>;
    /**
     * 自定义文件解析器
     *
     * 在读取文件时 调用`parse`方法将文件内容转换为`JSON`对象
     * 在写入文件时 调用`stringify`方法将`JSON`对象写入到文件中
     */
    parser?: FileParser;

    /**
     * 自定义翻译
     * @param record - 需要翻译的数据源
     * @param target - 翻译的目标语言
     * @param sourceLanguage - 数据源原本的语言
     * @returns Observable<TranslatedList<string>> | Promise<TranslatedList<string>>;
     */
    translator: (
      record: Record<string, string | string[]>,
      target: string,
      sourceLanguage: string
    ) => Observable<TranslatedList> | Promise<TranslatedList>;

    /**
     * 自定义插值替换
     * 
     * @remarks 
     * 在一些情况下 默认的占位符会被翻译引擎解析成其他的文本 从而引起文本异常 比如
     * 
     * 德语   `$$1` --> `1$$`
     * 
     * 瓦瑞语 `$$1`--> `$$100`
     * 
     * 因此可以通过该插件进行自定义替换 从而避免这种问题
     * 
     * @example
     * 
     * class InterpolationMapPlugin {
     *  interpolationMap(fn){
     *    fn(str => {
     *      return `@@${str}@@`
     *    })
     *  }
     * }
     */
    interpolationMap: InterpolationMapFn;

    hooks?: {
      'collect::completed'?: (tree: KeyTree<IBBTValue>, instance: BaseAction) => void;
      'collect::before_diff'?: (tree: KeyTree<IBBTValue>, instance: BaseAction) => void;
      'collect::after_diff'?: (tree: KeyTree<IBBTValue>, instance: BaseAction) => void;
    };
  };
}

const PROJECT_CONFIG_SOURCE = resolve(__dirname, '../template/config.js');
const PROJECT_DEFAULT_CONFIG = resolve(__dirname, '../template/full.config.js');

export interface IBBTGlobalConfig {
  GoogleKey?: string;
  DeepLKey?: string;
  ChatGPTKey?: string;
}

export function createProjectConfig(filePath: string): void {
  if (fse.existsSync(filePath)) {
    throw new ExistedFileError(filePath);
  }
  fse.copyFileSync(PROJECT_CONFIG_SOURCE, filePath);
}

export function getProjectConfig(filePath: string): IBBTProjectConfig {
  if (!fse.existsSync(filePath)) {
    throw new NotFileError(filePath);
  }
  // eslint-disable-next-line import/no-dynamic-require
  return require(filePath);
}

export function getDefaultProjectConfig(): IBBTProjectConfig {
  // eslint-disable-next-line import/no-dynamic-require
  return require(PROJECT_DEFAULT_CONFIG);
}
