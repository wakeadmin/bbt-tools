import { getFiles, getFilesAsync } from '../../utils';
import * as path from 'path';
import { filter, lastValueFrom, map, toArray } from 'rxjs';
import { Dirent } from 'fs-extra';

function p(_path: string): string {
  return path.join(__dirname, _path);
}

describe('utils file', () => {
  test('getFiles 无忽略目录', () => {
    expect(getFiles(path.join(__dirname, './temp'), [], file => file.isFile()).map(item => item.name)).toEqual([
      p('./temp/a/a.tr'),
      p('./temp/a/cai/m.tr'),
      p('./temp/b/c/s/y.tr'),
    ]);

    expect(
      getFiles(path.join(__dirname, './temp'), [], file => file.isFile() && path.basename(file.name) === 'y.tr').map(
        item => item.name
      )
    ).toEqual([p('./temp/b/c/s/y.tr')]);
  });
  test('getFiles 忽略目录', () => {
    expect(getFiles(path.join(__dirname, './temp'), ['a'], file => file.isFile()).map(item => item.name)).toEqual([
      p('./temp/b/c/s/y.tr'),
    ]);

    expect(getFiles(path.join(__dirname, './temp'), ['s$'], file => file.isFile()).map(item => item.name)).toEqual([
      p('./temp/a/a.tr'),
      p('./temp/a/cai/m.tr'),
    ]);

    expect(getFiles(path.join(__dirname, './temp'), ['c'], file => file.isFile()).map(item => item.name)).toEqual([
      p('./temp/a/a.tr'),
    ]);

    expect(getFiles(path.join(__dirname, './temp'), ['^c'], file => file.isFile()).map(item => item.name)).toEqual([
      p('./temp/a/a.tr'),
      p('./temp/a/cai/m.tr'),
      p('./temp/b/c/s/y.tr'),
    ]);

    expect(getFiles(path.join(__dirname, './temp'), ['cai$'], file => file.isFile()).map(item => item.name)).toEqual([
      p('./temp/a/a.tr'),
      p('./temp/b/c/s/y.tr'),
    ]);

    expect(getFiles(path.join(__dirname, './temp'), ['c/s'], file => file.isFile()).map(item => item.name)).toEqual([
      p('./temp/a/a.tr'),
      p('./temp/a/cai/m.tr'),
    ]);

    expect(getFiles(path.join(__dirname, './temp'), ['b/c/s'], file => file.isFile()).map(item => item.name)).toEqual([
      p('./temp/a/a.tr'),
      p('./temp/a/cai/m.tr'),
    ]);

    expect(getFiles(path.join(__dirname, './temp'), ['b'], file => file.isFile()).map(item => item.name)).toEqual([
      p('./temp/a/a.tr'),
      p('./temp/a/cai/m.tr'),
    ]);

    expect(
      getFiles(path.join(__dirname, './temp'), ['b/*', 'b/s'], file => file.isFile()).map(item => item.name)
    ).toEqual([p('./temp/a/a.tr'), p('./temp/a/cai/m.tr')]);

    expect(getFiles(path.join(__dirname, './temp'), ['b', 'a'], file => file.isFile()).map(item => item.name)).toEqual(
      []
    );

    expect(getFiles(path.join(__dirname, './temp'), ['b/s'], file => file.isFile()).map(item => item.name)).toEqual([
      p('./temp/a/a.tr'),
      p('./temp/a/cai/m.tr'),
      p('./temp/b/c/s/y.tr'),
    ]);
  });
});

describe('utils getFilesAsync', () => {
  async function __testFn(dirPath: string, regList: string[], filterFn: (item: Dirent) => boolean): Promise<string[]> {
    return await lastValueFrom(
      getFilesAsync(dirPath, regList).pipe(
        filter(filterFn),
        map(item => item.name),
        toArray()
      )
    );
  }
  test('getFilesAsync 无忽略目录', async () => {
    const list1 = await __testFn(path.join(__dirname, './temp'), [], file => file.isFile());
    expect(list1).toEqual([p('./temp/a/a.tr'), p('./temp/a/cai/m.tr'), p('./temp/b/c/s/y.tr')]);

    const list2 = await __testFn(
      path.join(__dirname, './temp'),
      [],
      file => file.isFile() && path.basename(file.name) === 'y.tr'
    );

    expect(list2).toEqual([p('./temp/b/c/s/y.tr')]);
  });
  test('getFilesAsync 忽略目录', async () => {
    const list1 = await __testFn(path.join(__dirname, './temp'), ['a'], file => file.isFile());
    expect(list1).toEqual([p('./temp/b/c/s/y.tr')]);
    const list2 = await __testFn(path.join(__dirname, './temp'), ['s$'], file => file.isFile());

    expect(list2).toEqual([p('./temp/a/a.tr'), p('./temp/a/cai/m.tr')]);

    const list3 = await __testFn(path.join(__dirname, './temp'), ['c'], file => file.isFile());
    expect(list3).toEqual([p('./temp/a/a.tr')]);

    const list4 = await __testFn(path.join(__dirname, './temp'), ['^c'], file => file.isFile());
    expect(list4).toEqual([p('./temp/a/a.tr'), p('./temp/a/cai/m.tr'), p('./temp/b/c/s/y.tr')]);

    const list5 = await __testFn(path.join(__dirname, './temp'), ['cai$'], file => file.isFile());
    expect(list5).toEqual([p('./temp/a/a.tr'), p('./temp/b/c/s/y.tr')]);

    const list6 = await __testFn(path.join(__dirname, './temp'), ['c/s'], file => file.isFile());
    expect(list6).toEqual([p('./temp/a/a.tr'), p('./temp/a/cai/m.tr')]);

    const list7 = await __testFn(path.join(__dirname, './temp'), ['b/c/s'], file => file.isFile());
    expect(list7).toEqual([p('./temp/a/a.tr'), p('./temp/a/cai/m.tr')]);

    const list8 = await __testFn(path.join(__dirname, './temp'), ['b'], file => file.isFile());
    expect(list8).toEqual([p('./temp/a/a.tr'), p('./temp/a/cai/m.tr')]);

    const list9 = await __testFn(path.join(__dirname, './temp'), ['b/*', 'b/s'], file => file.isFile());
    expect(list9).toEqual([p('./temp/a/a.tr'), p('./temp/a/cai/m.tr')]);

    const list10 = await __testFn(path.join(__dirname, './temp'), ['b', 'a'], file => file.isFile());
    expect(list10).toEqual([]);

    const list11 = await __testFn(path.join(__dirname, './temp'), ['b/s'], file => file.isFile());
    expect(list11).toEqual([p('./temp/a/a.tr'), p('./temp/a/cai/m.tr'), p('./temp/b/c/s/y.tr')]);
  });
});
