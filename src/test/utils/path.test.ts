import { parsePath, getRelative } from '../../utils';
import * as path from 'path';

function n(_path: string): string {
  return path.normalize(_path);
}

describe('utils path', () => {
  test('parsePath', () => {
    expect(parsePath(n('/sss/aaa/ddd'))).toEqual(['', 'sss', 'aaa']);
    expect(parsePath('')).toEqual(['']);
  });

  test('getRelative', () => {
    const basePath = 's:/ss/sss/ddd';
    expect(getRelative(n(basePath), n(`${basePath}/xxx/aaa`))).toBe('xxx/aaa');
    expect(getRelative(n('s:\\sss\\ssss\\sssss'), n('s:\\sss\\ssss\\sssss\\yy\\yyy\\yyyy'))).toBe('yy/yyy/yyyy');
  });
});
