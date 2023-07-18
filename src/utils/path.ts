import path from 'path';

const sep = path.sep;
const sepReg = /\\/g;
export function parsePath(dirPath: string): string[] {
  const { dir } = path.parse(dirPath);
  return dir.split(sep);
}

export function normalizePath(from: string): string {
  return path.normalize(from.replace(sepReg, '/'));
}

/**
 *
 * 获取相对位置，之后会将路径转换成`/`类型的
 * @remarks
 * 具体规则
 * {@link https://nodejs.org/dist/latest-v16.x/docs/api/path.html#pathrelativefrom-to  path.relative}
 *
 * @param from - from
 * @param to - to
 */
export function getRelative(from: string, to: string): string {
  return path.relative(from, to).replace(sepReg, '/');
}
