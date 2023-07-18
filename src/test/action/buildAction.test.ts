import fse from 'fs-extra';
import { setWith } from 'lodash';
import path from 'path';
import { BBTToolCommandLineParser } from '../../cli/commandLine';
import { BBTExcel, strToArray } from '../../utils';

const parser: BBTToolCommandLineParser = new BBTToolCommandLineParser();

const data = [
  ['sss', 'vvv', `丹唇外朗，皓齿内鲜`, ''],
  ['sss', 'aaaa', '髣髴兮若轻云之蔽月，飘飖兮若流风之回雪', ''],
  ['sss', 'aa.aa', '披罗衣之璀粲兮，珥瑶碧之华琚', ''],
  ['sss', 'vvva', '微幽兰之芳蔼兮，步踟蹰于山隅', ''],
  ['sss', 'vvvb', `SSS's`, ''],
  ['sss', 'CM', `['足往心留。遗情想像', '思绵绵而增慕。夜耿耿而不寐']`, ''],
];

const zhData = data.reduce((obj, item) => {
  setWith(obj, item[1], strToArray(item[2]));
  return obj;
}, {} as Record<string, string>);

const enData = data.reduce((obj, item) => {
  setWith(obj, item[1], item[3]);
  return obj;
}, {} as Record<string, string>);

const langs = ['zh', 'en'];

const outBasePath = path.join(__dirname, './temp/tr');

function createExcelFileIfNeed(file: string): Promise<void> {
  if (!fse.existsSync(file)) {
    fse.ensureDirSync(path.dirname(file));
    const excel = new BBTExcel();
    excel.create(langs);
    return excel.save(file);
  }
  return Promise.resolve();
}

async function createExcel(): Promise<void> {
  const excel = new BBTExcel();
  const filePath = path.join(__dirname, './temp/excel/bbt.xlsx');
  await createExcelFileIfNeed(filePath);
  await excel.readFile(filePath);
  data.forEach(row => {
    excel.addRow(row);
  });
  await excel.save(filePath);
}

function getFileValue(path: string): Record<string, string> {
  const content = fse.readFileSync(path).toString();
  return JSON.parse(content);
}

describe('build action', () => {
  beforeEach(() => {
    fse.emptyDirSync(path.join(__dirname, './temp/excel'));
    fse.emptyDirSync(path.join(outBasePath, './sss'));
  });
  afterEach(() => {
    fse.emptyDirSync(path.join(__dirname, './temp/excel'));
    fse.emptyDirSync(path.join(outBasePath, './sss'));
  });

  test('还原tr', async () => {
    await createExcel();
    await sleep(200);
    await parser.execute(['write', '-c', path.join(__dirname, './temp/config.js')]);
    await sleep(200);
    expect(getFileValue(path.join(outBasePath, './sss/zh.tr'))).toEqual(zhData);
    expect(getFileValue(path.join(outBasePath, './sss/en.tr'))).toEqual(enData);
  });
});

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve =>
    setTimeout(() => {
      resolve();
    }, ms)
  );
}
