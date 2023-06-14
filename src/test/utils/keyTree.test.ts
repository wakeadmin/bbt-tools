import { KeyTree, KeyTreeNodeType } from '../../utils';

let tree = new KeyTree();
beforeEach(() => {
  tree = new KeyTree();
});
describe('keyTree 测试', () => {
  test('新增/获取', () => {
    tree.add('S.SS.SSS.SSSS.SSSSS');
    expect(tree.get('S.SS.SSS.SSSS.SSSSS')?.key).toBe('SSSSS');
    expect(tree.has('S.SS.SSS.SSSS.SSSSS')).toBeTruthy();
    expect(tree.has('S.SS.SSS.SSSS.SSSS')).toBeFalsy();
    tree.add('S.AAA');
    expect(tree.has('S.AAA')).toBeTruthy();
    expect(tree.get('S.AAA')?.key).toBe('AAA');

    expect(() => tree.add('S.S1.S2.SS', KeyTreeNodeType.Leaf, false)).toThrow();
    tree.add('Y.Y1.Y2.YS', KeyTreeNodeType.Leaf);
    expect(tree.has('Y.Y1.Y2.YS')).toBeTruthy();
  });

  test('key检测', () => {
    expect(() => tree.add('XXX.')).toThrow();
    expect(() => tree.add('XXX.   ')).toThrow();
    expect(tree.has('XXX.   ')).toBeFalsy();
  });

  test('节点类型测试', () => {
    tree.add('VV', KeyTreeNodeType.Leaf);
    expect(() => tree.add('VV.AAA')).toThrow();

    tree.add('VO', KeyTreeNodeType.Node);
    expect(tree.add('VO.AAA')).toBeTruthy();
    expect(tree.get('VO.AAA')?.key).toBe('AAA');

    tree.add('VA', KeyTreeNodeType.Node);
    expect(tree.add('VA.AAA')).toBeTruthy();
    expect(tree.get('VA.AAA')?.key).toBe('AAA');
  });

  test('设置重复值', () => {
    const key = 'AA.AAA';

    expect(tree.add(key)).toBeTruthy();

    expect(() => tree.add(key)).toThrow();
    expect(() => tree.add('AA')).toThrow();

    tree.add('T.TT.TTT.TTTT');
    expect(() => tree.add('T')).toThrow();
    expect(() => tree.add('T.TT')).toThrow();
    expect(() => tree.add('T.TT.TTT')).toThrow();
    expect(() => tree.add('T.TT.TTT.TTTT')).toThrow();

    tree.add('Y1', KeyTreeNodeType.Leaf);
    expect(() => tree.add('Y1.YY1')).toThrow();

    tree.add('Y2', KeyTreeNodeType.Node);
    tree.add('Y2.YY1');
    expect(tree.has('Y2.YY1')).toBeTruthy();
  });
});
