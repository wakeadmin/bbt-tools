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
});
