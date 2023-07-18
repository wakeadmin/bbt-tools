import fse from 'fs-extra';
import { setWith } from 'lodash';
import ora from 'ora';
import path from 'path';
import { strToArray } from '../utils';
import { FileParser } from '../utils/parser';
import { IBBTValue } from '../utils/treeExcel';
import { BaseAction } from './baseAction';

/**
 *
 *
 * `Map<path, Record<lang, Record<key, string>>>`
 *
 * 大致如下
 *
 * ```json
 * {
 *  "../view/aPage": {
 *    "zh":{
 *        "hello": "你好"
 *     },
 *    "en":{
 *        "hello": "hello"
 *     }
 *
 *  }
 *
 * }
 *
 * ```
 */
export type LangRecord = Map<string, Record<string, Record<string, string>>>;

export class BuildAction extends BaseAction {
  constructor() {
    super({
      actionName: 'write',
      summary: '回写语言资源',
      documentation: '根据对应的 excel 文件, 生成语言包文件',
    });
  }

  protected onDefineParameters(): void {
    super.onDefineParameters();
  }

  protected async onExecute(): Promise<void> {
    await super.onExecute();
    const spinner = ora({
      text: '正在收集语言文件',
      spinner: 'dots8Bit',
    });
    try {
      spinner.start();
      const resourceInfo = await this.getResourceInfo();
      spinner.text = '正在生成文件';
      this.createResourceFile(resourceInfo);

      spinner.succeed('success');
    } catch (err) {
      console.error(err);
      spinner.stop();
      throw err;
    }
  }

  private async getResourceInfo(): Promise<LangRecord> {
    const excel = await this.readExcel();
    const tree = excel.toTree();
    const map: LangRecord = new Map();

    const setMapValue = (value: IBBTValue) => {
      const { path: filePath, key, ...langs } = value;
      if (map.has(filePath)) {
        const obj = map.get(filePath)!;
        for (const [lang, text] of Object.entries(langs)) {
          setWith(obj, `${lang}.${key}`, text, Object);
        }

        return;
      }

      map.set(
        filePath,
        Object.entries(langs).reduce<Record<string, any>>((record, [lang, text]) => {
          record[lang] = {
            [key]: text,
          };
          return record;
        }, {})
      );
    };

    tree.visitor(node => {
      if (node.isLeaf()) {
        setMapValue(node.getValue());
      }
    });

    return map;
  }

  private createResourceFile(map: LangRecord) {
    const langs = this.config.langs;
    const extName = this.config.outFileExtName;
    const baseName = path.join(this.basePath, this.config.resourcePath);

    for (const [output, info] of map) {
      for (const lang of langs) {
        const fileName = path.join(baseName, output, `./${lang}.${extName}`);

        fse.ensureFileSync(fileName);
        const obj = this.sortRecord(info[lang]);
        fse.writeFile(fileName, this.parser.stringify(obj));
      }
    }
  }

  /**
   * 排序 并尝试将str转换成 Array
   * @param record
   * @returns
   */
  private sortRecord(record: Record<string, string>): Record<string, any> {
    const keys = Object.keys(record).sort((a, b) => (a > b ? 1 : -1));
    const sortedRecord: Record<string, any> = {};
    for (const key of keys) {
      setWith(sortedRecord, key, strToArray(record[key]), Object);
    }
    return sortedRecord;
  }
}
