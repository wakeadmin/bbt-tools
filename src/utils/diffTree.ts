import { difference, intersection, pipe } from 'lodash/fp';
import { assignKeys, filterRemoveKey, setToArray } from './fn';
import { KeyTree, KeyTreeNode } from './keyTree';

export const enum DiffModeEnum {
  'Strict' = 'strict',
  'Relaxed' = 'relaxed',
}

export type DiffMutateFn<T extends {}> = (oldValue: T, newValue: T) => T;

/**
 * 两个节点进行对比
 *
 * 并对旧的节点进行**更新**
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

  const newChildrenKeys = newNode.children.map(item => item.key);
  const oldChildrenKeys = oldNode.children.map(item => item.key);

  const keys = pipe(assignKeys, filterRemoveKey, setToArray)(oldChildrenKeys, newChildrenKeys);

  const addKeys = difference(keys)(oldChildrenKeys);

  const modifierKeys = intersection(keys)(oldChildrenKeys);

  oldNode.mutate(oldValue => mutateFn(oldValue, newNode.getValue()));

  addKeys.forEach(key => {
    oldNode.addChild(key, newNode.getChild(key)!.clone());
  });

  modifierKeys.forEach(key => {
    oldNode.appendChild(key, assignNode(newNode.getChild(key)!, oldNode.getChild(key)!, mutateFn));
  });

  return oldNode;
}

export function diffTree<T extends {}>(
  newTree: KeyTree<T>,
  oldTree: KeyTree<T>,
  mutateFn: DiffMutateFn<T> = (oldValue, newValue) => newValue
): KeyTree<T> {
  const tree = oldTree.clone();
  assignNode(newTree.root, tree.root, mutateFn);
  return tree;
}
