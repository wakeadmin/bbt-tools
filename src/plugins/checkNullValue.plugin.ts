import { type BaseAction } from '../cli/baseAction';
import { IBBTValue, KeyTree, KeyTreeNode, warn } from '../utils';

function getNullValueNodes(tree: KeyTree<IBBTValue>, instance: BaseAction): KeyTreeNode<IBBTValue>[] {
  const lang = instance.config.langs[0];

  const nullValueNodes: KeyTreeNode<IBBTValue>[] = [];

  tree.visitor(node => {
    if (!node.isLeaf()) {
      return;
    }

    const value = node.getValue()[lang];

    // eslint-disable-next-line eqeqeq
    if (value === '' || value == undefined) {
      nullValueNodes.push(node);
    }
  });
  return nullValueNodes;
}

function checkNullValue(tree: KeyTree<IBBTValue>, instance: BaseAction): void {
  const nullValueNodes = getNullValueNodes(tree, instance);
  const lang = instance.config.langs[0];

  if (nullValueNodes.length === 0) {
    return;
  }
  const errorMap: Map<string, string[]> = new Map();

  for (const node of nullValueNodes) {
    const value = node.getValue();
    const path = value.path;
    if (errorMap.has(path)) {
      errorMap.get(path)!.push(value.key);
    } else {
      errorMap.set(path, [value.key]);
    }
  }

  warn(`** 以下节点基准语言值为空 **`);
  warn(`** 请写入对应的值，如确认为空请忽略本提示 **`);

  errorMap.forEach((values, file) => {
    warn(`\n文件 ${file}/${lang}`);
    values.forEach(key => warn(`  ${key}`));
  });
}

export const CheckNullValuePlugin = {
  hooks: {
    'collect::completed': (tree: KeyTree<IBBTValue>, instance: BaseAction) => {
      checkNullValue(tree, instance);
    },
  },
};
