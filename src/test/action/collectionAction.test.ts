import { CollectAction } from '../../cli/collectAction';
import { BBTToolCommandLineParser } from '../../cli/commandLine';
import { KeyTree, KeyTreeNodeType, getExcel } from '../../utils';
import { DiffModeEnum, diffTree } from '../../utils/diffTree';

import fse from 'fs-extra';
import path from 'path';
import { sleep } from '../test-helper';

const parser: BBTToolCommandLineParser = new BBTToolCommandLineParser();

class TestAction extends CollectAction {
  config = {
    langs: ['zh', 'en'],
  } as any;
  createDiffer(mode: DiffModeEnum) {
    return super.createDiffer(mode);
  }
}
const source = new KeyTree<{ key: string; path: string; zh: string; en: string }>();

source.add('s', KeyTreeNodeType.Node);
source.add('s.A', KeyTreeNodeType.Leaf).setValue({ key: 's.A', path: './temp', zh: '雨', en: 'rain' });

const testInstance = new TestAction();

describe('CollectionAction Differ', () => {
  test('Relaxed', () => {
    const differ = testInstance.createDiffer(DiffModeEnum.Relaxed);
    const tree = source.clone();
    tree.get('s.A')!.assign({ zh: '雷', en: 'rain' });

    const result = diffTree(tree, source, differ);

    expect(result.get('s.A')!.getValue()).toEqual({ key: 's.A', path: './temp', zh: '雷', en: 'rain' });
  });

  test('Strict', () => {
    const differ = testInstance.createDiffer(DiffModeEnum.Strict);
    const tree = source.clone();
    tree.get('s.A')!.assign({ zh: '雷', en: 'rain' });

    const result = diffTree(tree, source, differ);

    expect(result.get('s.A')!.getValue()).toEqual({ key: 's.A', path: './temp', zh: '雷', en: '' });
  });
});

function createTrFile(path: string, value: Record<string, any>) {
  fse.ensureFileSync(path);
  fse.writeFile(path, JSON.stringify(value), { encoding: 'utf8' });
}

function createConfig(path: string, value: string) {
  fse.ensureFileSync(path);
  fse.writeFile(path, value, { encoding: 'utf8' });
}

describe('CollectionAction', () => {
  const dirPath = './temp/collect';
  const fullDirPath = path.join(__dirname, dirPath);
  const excelPath = './src/test/action/temp/collect/bbt.csv';
  beforeEach(() => {
    fse.emptyDirSync(fullDirPath);
  });
  afterEach(() => {
    fse.emptyDirSync(fullDirPath);
  });

  test('Relaxed', async () => {
    createConfig(
      path.join(fullDirPath, './config.js'),
      `module.exports = {
      langs: ['zh', 'en'],
      src: './src/test/action/temp/collect',
      test: '.*\\\\.tr',
      exclude: ['node_modules'],
      bbtExcelPath: '${excelPath}',

    };
    `
    );

    createTrFile(path.join(fullDirPath, './zh.tr'), {
      a: '5',
    });

    createTrFile(path.join(fullDirPath, './en.tr'), {
      a: 5,
    });

    await sleep(200);
    await parser.execute(['collect', '-c', path.join(fullDirPath, './config.js')]);
    await sleep(200);

    const excel = await getExcel(excelPath);

    const tree = excel.toTree();

    const value = tree.get('a')?.getValue()

    expect(value.zh).toEqual("5");
    expect(value.en).toEqual("5");
  });
});
