import { flatObject, strToArray } from '../../utils/object';
const obj1 = {
  a: {
    b: {
      c: {
        d: {
          a: '隐约雷鸣',
          b: '阴霾天空',
        },
        f: {
          s: '但盼风雨来',
          ss: '能留你在此',
        },
      },
      mmm: {
        nnn: '隐约雷鸣',
        llll: '阴霾天空',
      },
    },
    iii: {
      ppp: {
        xxx: {
          yyy: '即使天无雨',
          zzz: '我亦留此地',
        },
      },
    },
  },
};
const obj2 = {
  'a.b.c.d.a': '隐约雷鸣',
  'a.b.c.d.b': '阴霾天空',
  'a.b.c.f.s': '但盼风雨来',
  'a.b.c.f.ss': '能留你在此',
  'a.b.mmm.nnn': '隐约雷鸣',
  'a.b.mmm.llll': '阴霾天空',
  'a.iii.ppp.xxx.yyy': '即使天无雨',
  'a.iii.ppp.xxx.zzz': '我亦留此地',
};
describe('flatObject', () => {
  test('无自定义前缀', () => {
    expect(flatObject(obj1)).toEqual(obj2);
    expect(flatObject({ 'aaa.bbb.ccc': 'SSS' })).toEqual({
      'aaa.bbb.ccc': 'SSS',
    });
  });

  test('自定义前缀', () => {
    expect(flatObject(obj1, { prefix: 'S' })).toEqual(
      Object.entries(obj2).reduce<any>((obj, [key, value]) => {
        obj[`S.${key}`] = value;
        return obj;
      }, {})
    );
    expect(flatObject({ 'aaa.bbb.ccc': 'SSS' }, { prefix: 'AAA.198.265' })).toEqual({
      'AAA.198.265.aaa.bbb.ccc': 'SSS',
    });
  });
});

describe('strToArray', () => {
  test('基操', () => {
    const arr = [
      [`丹唇外朗，皓齿内鲜`, '丹唇外朗，皓齿内鲜'],
      ['髣髴兮若轻云之蔽月，飘飖兮若流风之回雪', '髣髴兮若轻云之蔽月，飘飖兮若流风之回雪'],
      ['披罗衣之璀粲兮，珥瑶碧之华琚', '披罗衣之璀粲兮，珥瑶碧之华琚'],
      ['微幽兰之芳蔼兮，步踟蹰于山隅', '微幽兰之芳蔼兮，步踟蹰于山隅'],
      [`SSS's`, "SSS's"],
      [`["足往心留。遗情想像", "思绵绵而增慕。夜耿耿而不寐"]`, ['足往心留。遗情想像', '思绵绵而增慕。夜耿耿而不寐']],
    ];

    arr.forEach(([a, b]) => {
      expect(strToArray(a as string)).toEqual(b);
    });
  });
});
