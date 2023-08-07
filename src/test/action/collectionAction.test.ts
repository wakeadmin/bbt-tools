import { CollectAction } from '../../cli/collectAction';
import { KeyTree, KeyTreeNodeType } from '../../utils';
import { DiffModeEnum, diffTree } from '../../utils/diffTree';

class TestAction extends CollectAction {
  config = {
    langs: ['zh', 'en'],
  } as any;
  createDiffer(mode: DiffModeEnum) {
    return super.createDiffer(mode);
  }
}
const source = new KeyTree<{ key: string; path: string; zh: string; en: string }>();

source.add('s', KeyTreeNodeType.Node);
source.add('s.A', KeyTreeNodeType.Leaf).setValue({ key: 's.A', path: './temp', zh: '雨', en: 'rain' });

const testInstance = new TestAction();

describe('CollectionAction Differ', () => {
  test('Relaxed', () => {
    const differ = testInstance.createDiffer(DiffModeEnum.Relaxed);
    const tree = source.clone();
    tree.get('s.A')!.assign({ zh: '雷', en: 'rain' });

    const result = diffTree(tree, source, differ);

    expect(result.get('s.A')!.getValue()).toEqual({ key: 's.A', path: './temp', zh: '雷', en: 'rain' });
  });

  test('Strict', () => {
    const differ = testInstance.createDiffer(DiffModeEnum.Strict);
    const tree = source.clone();
    tree.get('s.A')!.assign({ zh: '雷', en: 'rain' });

    const result = diffTree(tree, source, differ);

    expect(result.get('s.A')!.getValue()).toEqual({ key: 's.A', path: './temp', zh: '雷', en: '' });
  });
});
