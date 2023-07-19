import { Dirent, existsSync } from 'fs';
import { mergeWith } from 'lodash';
import ora from 'ora';
import Path from 'path';

import { filter, lastValueFrom, map, mergeMap, Observable, share } from 'rxjs';
import {
  DiffModeEnum,
  DiffMutateFn,
  diffTree,
  getFilesAsync,
  getRelative,
  KeyTree,
  KeyTreeNode,
  KeyTreeNodeType,
  readFileAsync,
} from '../utils';

import { BBTCsv, IBBTValue } from '../utils/treeExcel';
import { BaseAction } from './baseAction';

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

      const newTree = await this.createTreeForTranslateFile();

      let tree: KeyTree<IBBTValue>;

      if (this.needDiff()) {
        spinner.text = '正在读取集合文件';

        const oldTree = await this.readExcel().then(excel => excel.toTree());
        spinner.text = '对比中';
        const mutateFn = this.createDiffer(this.config.diffMode);
        tree = diffTree(newTree, oldTree, mutateFn);
      } else {
        tree = newTree;
      }

      const excel = BBTCsv.fromTree(tree, this.config.langs);
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

    const createNode = (value: string | any[] | Record<string, any>, parent: KeyTreeNode<IBBTValue>, key: string) => {
      const nodeType = typeof value === 'string' || Array.isArray(value) ? KeyTreeNodeType.Leaf : KeyTreeNodeType.Node;
      return parent.addChild(key, nodeType);
    };

    const setNodeValue = (
      parent: KeyTreeNode<IBBTValue>,
      obj: {
        path: string;
        key: string;
        lang: string;
        value: Record<string, any> | string | any[];
      }
    ) => {
      const { key, path, lang, value } = obj;
      let node = parent.getChild(key) || createNode(value, parent, key);

      if (typeof value === 'string' || Array.isArray(value)) {
        node.assign({
          path,
          [lang]: value,
          key: node.fullKey,
        });
      } else {
        Object.entries(value).forEach(([childKey, childValue]) => {
          setNodeValue(node, {
            key: childKey,
            value: childValue,
            lang,
            path,
          });
        });
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
          setNodeValue(tree.root, {
            path,
            key,
            lang: name,
            value,
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

  private needDiff(): boolean {
    const { bbtExcelPath } = this.config;
    return existsSync(bbtExcelPath);
  }
}
