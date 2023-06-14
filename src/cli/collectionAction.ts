import { Dirent } from 'fs';
import ora from 'ora';
import Path from 'path';
import { filter, lastValueFrom, map, mergeMap, Observable, share } from 'rxjs';
import {
  FileParser,
  getFilesAsync,
  getRelative,
  KeyTree,
  KeyTreeNodeType,
  readFileAsync,
  DiffModeEnum,
  DiffMutateFn,
  diffTree,
} from '../utils';
import { BBTCsv, IBBTValue } from '../utils/treeExcel';
import { BaseAction } from './baseAction';
import { mergeWith } from 'lodash';

export class CollectionAction extends BaseAction {
  constructor() {
    super({
      actionName: 'collection',
      summary: '收集符合要求的语言包',
      documentation: '收集符合要求的语言包并按指定的文件结构供翻译人员翻译',
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
      const [oldTree, newTree] = await Promise.all([
        this.readExcel().then(excel => excel.toTree()),
        this.createTreeForTranslateFile(),
      ]);

      spinner.text = '对比中';

      const mutateFn = this.createDiffer(this.config.diffMode);
      const tree = diffTree(newTree, oldTree, mutateFn);

      const excel = BBTCsv.fromTree(tree);
      excel.save(this.config.bbtExcelPath);

      spinner.succeed('success');
    } catch (err) {
      console.error(err);
      spinner.stop();
      throw err;
    }
  }

  /**
   *
   * 读取语言文件的内容
   * @remarks
   * 读取的文件默认为`JSON`格式
   *
   * 因此会对文件内容做一次JSON转换
   * 所以请确保匹配的对象为JSON文件
   *
   * @private
   */
  protected async createTreeForTranslateFile(): Promise<KeyTree<IBBTValue>> {
    const langs = this.config.langs;
    const tree = new KeyTree<IBBTValue>();

    const setNodeValue = (key: string, value: IBBTValue) => {
      const node = tree.get(key);
      if (node) {
        node.assign(value);
      } else {
        tree.add(key, KeyTreeNodeType.Leaf, true).setValue(value);
      }
    };

    const source$ = this.collectionLangFile().pipe(
      mergeMap(
        filePath =>
          readFileAsync(filePath, 'utf-8').pipe(
            map(str => {
              return {
                content: this.parser.parse(str),
                fileName: filePath,
              };
            })
          ),
        10
      ),
      share()
    );

    source$.subscribe(({ fileName, content }) => {
      const { dir, name } = Path.parse(fileName);
      const path = getRelative(this.basePath, dir);
      if (langs.includes(name)) {
        for (const [key, value] of Object.entries(content)) {
          setNodeValue(key, {
            path,
            key,
            [name]: value,
          });
        }
      }
    });

    await lastValueFrom(source$, { defaultValue: 0 });
    return tree;
  }

  private collectionLangFile(): Observable<string> {
    const reg = new RegExp(this.config.test);
    const filterFn = (file: Dirent) => file.isFile() && reg.test(file.name);
    return getFilesAsync(this.config.src, this.config.exclude).pipe(
      filter(filterFn),
      map(file => file.name)
    );
  }

  protected createDiffer(mode: DiffModeEnum): DiffMutateFn<IBBTValue> {
    const [consult, ...otherLangs] = this.config.langs;
    switch (mode) {
      case DiffModeEnum.Relaxed:
        return (_, value) => value;
      case DiffModeEnum.Strict:
        return (oldValue, newValue) => {
          if (newValue[consult] !== oldValue[consult]) {
            return {
              ...newValue,
              ...Object.fromEntries(otherLangs.map(k => [k, ''])),
            };
          }
          return mergeWith(newValue, oldValue, (source, src) => {
            return source || src;
          });
        };
      default:
        throw new Error('无法找到对应的differ');
    }
  }
}
