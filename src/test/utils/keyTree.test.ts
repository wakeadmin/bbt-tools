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

    tree.add('Y.Y1.Y2.YS', KeyTreeNodeType.Leaf);
    expect(tree.has('Y.Y1.Y2.YS')).toBeTruthy();

    const keys = ['p', 'p-p', '__pp--pp__', '$$o--c$', '--$/2331__=', '$$%%s_'];
    tree.add(keys.join('.'));

    let prefix = '';
    for (var i = 0; i < keys.length; i++) {
      const key = prefix ? `${prefix}.${keys[i]}` : keys[i];

      expect(tree.has(key)).toBeTruthy();
      expect(tree.get(key)?.key).toBe(keys[i]);

      prefix = key;
    }
  });

  test('新增直接子节点', () => {
    expect(() => tree.add('S.SS.SSS.SSSS.SSSSS', KeyTreeNodeType.Leaf, false)).toThrowError();

    tree.add('s', KeyTreeNodeType.Node);

    tree.add('S.AAA');

    expect(tree.has('S.AAA')).toBeTruthy();

    expect(tree.get('S.AAA')?.key).toBe('AAA');

    const keys = ['p', 'p-p', '__pp--pp__', '$$o--c$', '--$/2331__=', '$$%%s_'];

    let prefix = '';
    for (var i = 0; i < keys.length; i++) {
      const key = prefix ? `${prefix}.${keys[i]}` : keys[i];
      tree.add(key, KeyTreeNodeType.Node);
      
      expect(tree.has(key)).toBeTruthy();
      expect(tree.get(key)?.key).toBe(keys[i]);

      prefix = key;
    }

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

  test('clone', () => {
    tree
      .add('K', KeyTreeNodeType.Node)
      .addChild('KK', KeyTreeNodeType.Node)
      .addChild('KKK', KeyTreeNodeType.Leaf)
      .setValue({ value: 'S' });

    const cloneTree = tree.clone();

    const node = cloneTree.get('K.KK.KKK')!;
    expect(node.fullKey).toBe('K.KK.KKK');
    expect(node.key).toBe('KKK');

    expect(node.getValue()).toEqual({
      value: 'S',
    });

    tree.get('K.KK.KKK')!.setValue({ name: 'S' });

    expect(node.getValue()).toEqual({ value: 'S' });
    expect(tree.get('K.KK.KKK')!.getValue()).toEqual({ name: 'S' });
  });
});
