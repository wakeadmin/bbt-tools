import { intersection } from 'lodash/fp';
import { KeyTree, KeyTreeNode } from './keyTree';

export const enum DiffModeEnum {
  'Strict' = 'strict',
  'Relaxed' = 'relaxed',
}

export type DiffMutateFn<T extends {}> = (oldValue: T, newValue: T) => T;

function patchKeys<T extends {}>(newNode: KeyTreeNode<T>, oldNode: KeyTreeNode<T>): { modifierKeys: string[] } {
  const newChildrenKeys = newNode.children.map(item => item.key);

  const oldChildrenKeys = oldNode.children.map(item => item.key);

  const modifierKeys = intersection(newChildrenKeys)(oldChildrenKeys);

  return { modifierKeys };
}

/**
 * 两个节点进行对比
 *
 * 并对新的节点进行**更新**
 *
 * @param newNode
 * @param oldNode
 * @returns
 */
export function assignNode<T extends {}>(
  newNode: KeyTreeNode<T>,
  oldNode: KeyTreeNode<T>,
  mutateFn: DiffMutateFn<T> = (oldValue, newValue) => newValue
): KeyTreeNode<T> {
  if (oldNode.nodeType !== newNode.nodeType) {
    return newNode.clone();
  }

  const { modifierKeys } = patchKeys<T>(newNode, oldNode);

  newNode.mutate(newValue => mutateFn(oldNode.getValue(), newValue));

  modifierKeys.forEach(key => {
    newNode.setChild(key, assignNode(newNode.getChild(key)!, oldNode.getChild(key)!, mutateFn));
  });

  return newNode;
}

/**
 * 两棵树进行对比
 *
 * 以新的为基准 将旧树的值和新的值进行对应的修改
 *
 * @param newNode
 * @param oldNode
 * @returns
 */
export function diffTree<T extends {}>(
  newTree: KeyTree<T>,
  oldTree: KeyTree<T>,
  mutateFn: DiffMutateFn<T> = (oldValue, newValue) => newValue
): KeyTree<T> {
  const tree = newTree.clone();
  assignNode(tree.root, oldTree.root, mutateFn);
  return tree;
}
