import { CellValue, Row, Workbook, Worksheet } from 'exceljs';
import fse from 'fs-extra';
import { dirname, extname } from 'path';
import { KeyTree, KeyTreeNodeType } from './keyTree';

const SHEET_NAME = 'BBT';

export const PATH_KEY = 'path';
export const KEY_KEY = 'key';

export interface IBBTValue {
  path: string;
  key: string;
  [locale: string]: string | string[];
}

export class BBTExcel<T extends IBBTValue = any> {
  protected workBook!: Workbook;
  protected workSheet!: Worksheet;
  protected ready = false;
  protected columnMap: Record<keyof T, number> = {} as any;

  async readFile(file: string) {
    if (this.ready) {
      throw new Error('BBTExcel has been initialized');
    }
    if (!fse.existsSync(file)) {
      throw new Error(`file (${file}) does not exist !`);
    }
    const workBook = new Workbook();
    this.workBook = await workBook.xlsx.readFile(file);

    this.workSheet = this.workBook.getWorksheet(SHEET_NAME);
    const langSet = new Set(
      (this.workSheet.getRow(1).values as string[]).filter(val => val !== PATH_KEY && val !== KEY_KEY)
    );
    this.initColumns(langSet);
    this.ready = true;
  }

  create(langs: string[]) {
    if (this.ready) {
      throw new Error('BBTExcel has been initialized');
    }

    const langSet = new Set(langs);
    this.workBook = new Workbook();

    this.workSheet = this.workBook.addWorksheet(SHEET_NAME, {
      views: [{ state: 'frozen', xSplit: 3, ySplit: 1 }],
    });

    this.initColumns(langSet);

    this.ready = true;
  }

  protected initColumns(langSet: Set<string>) {
    const columns = [
      {
        header: PATH_KEY,
        key: PATH_KEY,
        width: 30,
      },
      {
        header: KEY_KEY,
        key: KEY_KEY,
        width: 20,
      },
    ].concat(
      [...langSet.values()].map(lang => ({
        header: lang,
        key: lang,
        width: 65,
      }))
    );
    this.workSheet.columns = columns;
    columns.forEach(({ key }, i) => {
      this.columnMap[key as keyof T] = i + 1;
    });
  }

  protected checkReady() {
    if (!this.ready) {
      throw new Error('Please call "create" or "readFile" to initialize');
    }
  }

  getHeader(): Exclude<keyof T, Symbol | Number>[] {
    this.checkReady();
    return this.workSheet.columns.map(item => item.key) as Exclude<keyof T, Symbol | Number>[];
  }

  eachRow(fn: (row: Row, rowNumber: number) => void): void {
    this.checkReady();
    this.workSheet.eachRow((row, i) => fn(row, i));
  }

  async save(file: string): Promise<void> {
    this.checkReady();

    fse.ensureDirSync(dirname(file));

    await this.workBook.xlsx.writeFile(file);
  }

  private getRowValue(row: Row, key: string): string {
    const index = this.columnMap[key];
    const value = (row.values as any)[index] as CellValue;
    if (typeof value === 'boolean') {
      throw new Error(`value is Object -> rows: ${row.number}; key: ${key} `);
    }
    return value as string;
  }

  toTree(): KeyTree<T> {
    const tree = new KeyTree<T>();
    const langs = this.getHeader().slice(2);

    const createValue = (row: Row) => {
      return langs.reduce(
        (obj, key) => {
          // @ts-expect-error
          obj[key] = this.getRowValue(row, key);
          return obj;
        },
        {
          path: this.getRowValue(row, PATH_KEY),
          key: this.getRowValue(row, KEY_KEY),
        }
      ) as T;
    };

    this.eachRow((row, i) => {
      if (i === 1) {
        return;
      }
      try {
        const key = this.getRowValue(row, KEY_KEY);
        tree.add(key, KeyTreeNodeType.Leaf).setValue(createValue(row));
      } catch (e) {
        console.warn(e);
      }
    });

    return tree;
  }

  addRow(value: T): void {
    this.workSheet.addRow(value);
  }

  static fromTree<K extends IBBTValue>(tree: KeyTree<any>, langs: string[]): BBTExcel<K> {
    const excel = new this<K>();

    excel.create(langs);

    tree.visitor(node => {
      if (node.nodeType === KeyTreeNodeType.Leaf) {
        excel.addRow(node.getValue());
      }
    });

    return excel;
  }
}

export class BBTCsv<T extends IBBTValue> extends BBTExcel<T> {
  async readFile(file: string) {
    if (this.ready) {
      throw new Error('BBTExcel has been initialized');
    }

    if (!fse.existsSync(file)) {
      throw new Error(`file (${file}) does not exist !`);
    }

    const workBook = new Workbook();
    this.workBook = workBook;

    this.workSheet = await workBook.csv.readFile(file);

    const langSet = new Set(
      (this.workSheet.getRow(1).values as string[]).filter(val => val !== PATH_KEY && val !== KEY_KEY)
    );

    this.initColumns(langSet);

    this.ready = true;
  }

  async save(file: string): Promise<void> {
    this.checkReady();

    fse.ensureDirSync(dirname(file));

    const stream = fse.createWriteStream(file, { flags: 'w', encoding: 'utf8' });
    /**
     * csv采用BOM编码
     * 因此需要手动在文件头部写入对应的编码信息
     */
    stream.write(Buffer.from([0xef, 0xbb, 0xbf]));
    await this.workBook.csv.write(stream);
  }
}

export function getExcelCtor(filePath: string): typeof BBTCsv<any> | typeof BBTExcel<any> {
  const ext = extname(filePath);
  switch (ext) {
    case '.xlsx': {
      return BBTExcel;
    }
    case '.csv': {
      return BBTCsv;
    }
    default:
      throw new Error(`读取Excel文件失败: 不支持的扩展名 -> ${ext};目前只支持 ".xlsx"、".csv"`);
  }
}

export async function getExcel(filePath: string): Promise<BBTExcel> {
  const Ctor = getExcelCtor(filePath);
  const instance = new Ctor();
  await instance.readFile(filePath);
  return instance;
}
