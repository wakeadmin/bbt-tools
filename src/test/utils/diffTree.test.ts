import { KeyTree, KeyTreeNodeType } from '../../utils';
import { diffTree } from '../../utils/diffTree';

const source = new KeyTree<{ name: string }>();

source.add('s', KeyTreeNodeType.Node);
source.add('s.A', KeyTreeNodeType.Leaf).setValue({ name: 'SA' });

describe('diff tree', () => {
  test('type edit 1', () => {
    const tree = source.clone();
    tree.get('s')!.nodeType = KeyTreeNodeType.Leaf;
    tree.get('s')!.setValue({ name: 'yui' });

    const result = diffTree(tree, source);

    expect(result.get('s')!.nodeType).toBe(KeyTreeNodeType.Leaf);
    expect(result.get('s')!.getValue().name).toBe('yui');
    expect(result.get('s.A')).toBeNull();
  });

  test('object diff', () => {
    const treeA = source.clone() as KeyTree<{ name: string; age: number }>;
    treeA.get('s.A')!.mutate(val => {
      val.age = 29;
      return val;
    });

    const resultA = diffTree(treeA, source);

    expect(resultA.get('s.A')!.getValue()).toEqual({
      name: 'SA',
      age: 29,
    });

    const treeB = source.clone();

    const resultB = diffTree(treeB, treeA);

    expect(treeB.get('s.A')!.getValue()).toEqual({
      name: 'SA',
    });
    expect(treeA.get('s.A')!.getValue()).toEqual({
      name: 'SA',
      age: 29,
    });
    expect(resultB.get('s.A')!.getValue()).toEqual({
      name: 'SA',
    });
  });

  test('type edit 2', () => {
    const tree = source.clone();
    tree.get('s.A')!.nodeType = KeyTreeNodeType.Node;
    tree.add('s.A.A', KeyTreeNodeType.Leaf)!.setValue({ name: 'yui' });

    const result = diffTree(tree, source);

    expect(result.get('s.A')!.nodeType).toBe(KeyTreeNodeType.Node);
    expect(result.get('s.A')!.getValue()).toBeUndefined();
    expect(result.get('s.A.A')!.getValue().name).toBe('yui');
  });

  test('add', () => {
    const tree = source.clone();
    tree.add('s.X', KeyTreeNodeType.Leaf).setValue({ name: 'ue' });
    expect(tree.get('s.X')!.nodeType).toBe(KeyTreeNodeType.Leaf);

    const result = diffTree(tree, source);

    expect(result.get('s')!.nodeType).toBe(KeyTreeNodeType.Node);
    expect(result.get('s.X')!.getValue().name).toBe('ue');
  });

  test('delete', () => {
    const treeA = source.clone();

    treeA.add('s.delete', KeyTreeNodeType.Leaf).setValue({ name: 'delete' });

    const result = diffTree(source, treeA);

    expect(result.get('s.delete')).toBeNull();

    expect(result.get('s.A')).toBeDefined();
  });

  test('大杂烩', () => {
    const treeA = source.clone();
    const treeB = source.clone();

    const treeAKeys = ['Y1', 'Y2', 'Y3'];
    const treeBKeys = ['U1', 'U2', 'U3'];
    const commonKeys = ['I1', 'I2', 'I3'];

    treeAKeys.forEach(key => treeA.add(`s.${key}`, KeyTreeNodeType.Leaf).setValue({ name: key }));
    treeBKeys.forEach(key => treeB.add(`s.${key}`, KeyTreeNodeType.Leaf).setValue({ name: key }));
    commonKeys.forEach(key => {
      treeA.add(`s.${key}`, KeyTreeNodeType.Leaf).setValue({ name: key + 'A' });
      treeB.add(`s.${key}`, KeyTreeNodeType.Leaf).setValue({ name: key + 'B' });
    });

    const resultA = diffTree(treeA, treeB);

    treeAKeys.forEach(key => {
      expect(resultA.get(`s.${key}`)!.getValue()).toEqual({ name: key });
    });

    treeBKeys.forEach(key => {
      expect(resultA.get(`s.${key}`)).toBeNull();
    });

    commonKeys.forEach(key => {
      expect(resultA.get(`s.${key}`)!.getValue()).toEqual({ name: key + 'A' });
    });

    const resultB = diffTree(treeB, treeA);

    treeAKeys.forEach(key => {
      expect(resultB.get(`s.${key}`)).toBeNull();
    });

    treeBKeys.forEach(key => {
      expect(resultB.get(`s.${key}`)!.getValue()).toEqual({ name: key });
    });

    commonKeys.forEach(key => {
      expect(resultB.get(`s.${key}`)!.getValue()).toEqual({ name: key + 'B' });
    });
  });
});
