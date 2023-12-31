import { strToArray } from '../../utils/object';

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
