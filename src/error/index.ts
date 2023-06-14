import logSymbols from 'log-symbols';

export class NotFileError extends Error {
  constructor(path: string) {
    super(`${logSymbols.error} 文件不存在 -> (${path})`);
  }
}

export class ExistedFileError extends Error {
  constructor(path: string) {
    super(`${logSymbols.error} 文件已存在 -> (${path})`);
  }
}

export class LangKeyExistedError extends Error {
  constructor(key: string);
  constructor(key: string, path1: string, path2: string);
  constructor(key: string, path1?: string, path2?: string) {
    const pathStr = path1 ? `文件1: (${path1}) - 文件2: (${path2})` : '';
    super(`${logSymbols.error} 存在相同的key -> [${key}] ${pathStr}`);
  }
}

export class ExcelRecordMetaNullError extends Error {
  constructor(key: string) {
    super(`${logSymbols.error} 无法获取到指定key [${key}] 的meta`);
  }
}

export class ExcelChangeError extends Error {
  constructor(changeType: string) {
    super(`${logSymbols.error} 不支持该变更操作 [${changeType}]`);
  }
}

export class ExcelStateError extends Error {
  constructor() {
    super(`${logSymbols.error} 当前状态无法执行该操作`);
  }
}
