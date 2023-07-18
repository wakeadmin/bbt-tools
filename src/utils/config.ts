import chalk from 'chalk';
import fse from 'fs-extra';
import { platform } from 'os';
import { resolve } from 'path';
import { type Observable } from 'rxjs';
import ts from 'typescript';
import { ExistedFileError, NotFileError } from '../error';
import { TranslatedList } from '../translate';
import { DiffModeEnum } from './diffTree';
import { FileParser } from './parser';

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
    // collectionFile?: (
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
      record: Record<string, string>,
      target: string,
      sourceLanguage: string
    ) => Observable<TranslatedList<string>> | Promise<TranslatedList<string>>;
  };
}

const PROJECT_CONFIG_SOURCE = resolve(__dirname, '../template/config.js');
const PROJECT_DEFAULT_CONFIG = resolve(__dirname, '../template/full.config.js');
const IS_LINUX = platform() === 'linux';

const HOME = IS_LINUX ? process.env.HOME! : resolve(process.env.HOMEDRIVE || '', process.env.HOMEPATH || '');

const CONFIG_PATH = resolve(HOME, './.bbt/config.json');

function save(config: IBBTGlobalConfig) {
  fse.ensureFileSync(CONFIG_PATH);
  fse.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function read(): IBBTGlobalConfig {
  if (fse.existsSync(CONFIG_PATH)) {
    return JSON.parse(fse.readFileSync(CONFIG_PATH, 'utf8') || '{}');
  }
  return {};
}

export interface IBBTGlobalConfig {
  GoogleKey?: string;
  DeepLKey?: string;
}

let cache: IBBTGlobalConfig;

export function setGlobalConfig<K extends keyof IBBTGlobalConfig = keyof IBBTGlobalConfig>(
  key: K,
  value: IBBTGlobalConfig[K]
): void {
  cache ??= read();
  cache[key] = value;
  save(cache);
}

export function getGlobalConfig<K extends keyof IBBTGlobalConfig = keyof IBBTGlobalConfig>(
  key: K
): IBBTGlobalConfig[K] {
  cache ??= read();
  return cache[key];
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

function createTsSourceFile(file: string): ts.SourceFile {
  const code = fse.readFileSync(file, 'utf-8');

  return ts.createSourceFile('temp.ts', code, ts.ScriptTarget.ESNext);
}

function createInitializer(value: string | string[]): ts.Expression {
  if (Array.isArray(value)) {
    return ts.factory.createArrayLiteralExpression(value.map(str => ts.factory.createStringLiteral(str)));
  }

  return ts.factory.createStringLiteral(value);
}

export function updateProjectConfig(
  filePath: string,
  key: Exclude<keyof IBBTProjectConfig, 'plugins'>,
  value: string
): void {
  const sourceFile = createTsSourceFile(filePath);
  const transformationResult = ts.transform(sourceFile, [
    (context: ts.TransformationContext) => rootNode => {
      function visitor(node: ts.Node): ts.Node {
        if (ts.isPropertyAssignment(node)) {
          if (node.name.getText(sourceFile) === key) {
            return context.factory.createPropertyAssignment(node.name, createInitializer(value));
          }
        }

        return ts.visitEachChild(node, visitor, context);
      }

      return ts.visitNode(rootNode, visitor) as ts.SourceFile;
    },
  ]);

  const transformedSourceFile = transformationResult.transformed[0];
  const printer = ts.createPrinter();

  const result = printer.printNode(ts.EmitHint.Unspecified, transformedSourceFile, sourceFile);

  fse.writeFileSync(filePath, result);

  console.log(chalk.rgb(2, 46, 86)(`更新文件 ${filePath}`));
}
