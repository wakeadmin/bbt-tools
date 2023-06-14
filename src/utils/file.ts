import { Dirent, readdirSync, promises as fsPromises } from 'fs';
import path from 'path';
import { concatMap, filter, from, Observable, map, of, mergeMap } from 'rxjs';
import { getRelative } from './path';

function createExcludeReg(exclude: string[]): [RegExp[], RegExp[]] {
  const tailMatch = [] as RegExp[];
  const match = [] as RegExp[];
  for (const text of exclude) {
    if (text.endsWith('$')) {
      tailMatch.push(new RegExp(text));
    } else {
      match.push(new RegExp(text));
    }
  }
  return [match, tailMatch];
}

export function readFileAsync(filePath: string): Observable<Buffer>;
export function readFileAsync(filePath: string, encoding: BufferEncoding): Observable<string>;
export function readFileAsync(filePath: string, encoding?: BufferEncoding): Observable<Buffer | string> {
  return from(fsPromises.readFile(filePath, { encoding }));
}

/**
 *
 * 获取指定目录下符合要求的文件
 *
 *
 * @remarks
 * `exclude`是一个根据正则进行过滤的数组, 假设`src`设置为`src/`, 且目录如下
 * ``` yaml
 *  - src
 *   - module
 *     - test
 *   - test
 *     - module
 *   - component
 * ```
 * `test` -> 忽略所有`test`目录
 *
 * `test$` -> 只会忽略`src/module/test`, 不会忽略`src/test`
 *
 * `^test` -> 只会忽略`src/test`, 不会忽略`src/module/test`
 *
 *
 *
 * @param dirPath - 目录地址
 * @param exclude - 忽略的目录
 * @param filterFn - 过滤函数
 *
 * @public
 */
export function getFiles(dirPath: string, exclude: string[], filterFn: (file: Dirent) => boolean): Dirent[] {
  const normalizeDirPath = path.isAbsolute(dirPath) ? path.normalize(dirPath) : path.join(process.cwd(), dirPath);
  const [normalReg, tailReg] = createExcludeReg(exclude);
  const dirList = [{ name: normalizeDirPath }] as Dirent[];
  const resultList: Dirent[] = [];
  while (dirList.length) {
    const currentPath = dirList.shift()!.name;
    const currentRelative = getRelative(dirPath, currentPath);

    let direntList = readdirSync(currentPath, { withFileTypes: true }).map(item => {
      item.name = path.join(currentPath, './', item.name);
      return item;
    });

    // 只忽略该文件夹下的所有子文件
    if (tailReg.some(reg => reg.test(currentRelative))) {
      direntList = direntList.filter(dirent => dirent.isDirectory());
    }

    for (const dirent of direntList) {
      if (dirent.isDirectory()) {
        const relativePath = getRelative(dirPath, dirent.name);
        if (!normalReg.some(reg => reg.test(relativePath))) {
          dirList.push(dirent);
        }
      }
      if (filterFn(dirent)) {
        resultList.push(dirent);
      }
    }
  }
  return resultList;
}

export function readDirAsync(dirPath: string): Observable<Dirent> {
  return from(fsPromises.readdir(dirPath, { withFileTypes: true, encoding: 'utf8' })).pipe(
    concatMap(list => from(list)),
    map(file => {
      file.name = path.join(dirPath, './', file.name);
      return file;
    })
  );
}

function walk(dirPath: string, tailMatch: RegExp[], match: RegExp[], basePath: string): Observable<Dirent> {
  const relativePath = getRelative(basePath, dirPath);
  const fileFilterFn: (file: Dirent) => boolean = tailMatch.some(reg => reg.test(relativePath))
    ? file => file.isDirectory()
    : () => true;

  return readDirAsync(dirPath).pipe(
    filter(fileFilterFn),
    filter(file => {
      if (file.isFile()) {
        return true;
      }
      const filePath = getRelative(basePath, file.name);
      return !match.some(reg => reg.test(filePath));
    }),
    mergeMap(file => {
      if (file.isDirectory()) {
        return walk(file.name, tailMatch, match, basePath);
      }
      return of(file);
    })
  );
}

/**
 * 获取目录下所有符合要求的文件
 *
 * @param dirPath - 目录路径
 * @param exclude - 忽略目录的正则表达式字符串
 *
 * @public
 */
export function getFilesAsync(dirPath: string, exclude: string[]): Observable<Dirent> {
  const normalizePath = path.isAbsolute(dirPath) ? path.normalize(dirPath) : path.join(process.cwd(), dirPath);
  const [normalReg, tailReg] = createExcludeReg(exclude);

  return walk(normalizePath, tailReg, normalReg, normalizePath);
}
