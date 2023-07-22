import { difference, intersection } from 'lodash/fp';
import { KeyTree, KeyTreeNode } from './keyTree';

export const enum DiffModeEnum {
  'Strict' = 'strict',
  'Relaxed' = 'relaxed',
}

const DELETEKEY = '@remove@';

export type DiffMutateFn<T extends {}> = (oldValue: T, newValue: T) => T;

function patchKeys<T extends {}>(
  newNode: KeyTreeNode<T>,
  oldNode: KeyTreeNode<T>
): { deleteKeys: string[]; addKeys: string[]; modifierKeys: string[] } {
  const { deleteKeys, newChildrenKeys } = newNode.children
    .map(item => item.key)
    .reduce<{ deleteKeys: string[]; newChildrenKeys: string[] }>(
      (obj, key) => {
        if (key.endsWith(DELETEKEY)) {
          obj.deleteKeys.push(key.slice(0, key.length - DELETEKEY.length));
        } else {
          obj.newChildrenKeys.push(key);
        }
        return obj;
      },
      { deleteKeys: [], newChildrenKeys: [] }
    );

  const oldChildrenKeys = oldNode.children.map(item => item.key);

  const addKeys = difference(newChildrenKeys)(oldChildrenKeys);

  const modifierKeys = intersection(newChildrenKeys)(oldChildrenKeys);
  return { deleteKeys, addKeys, modifierKeys };
}

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

  const { deleteKeys, addKeys, modifierKeys } = patchKeys<T>(newNode, oldNode);

  oldNode.mutate(oldValue => mutateFn(oldValue, newNode.getValue()));

  deleteKeys.forEach(key => newNode.delete(key));

  addKeys.forEach(key => {
    oldNode.addChild(key, newNode.getChild(key)!.clone());
  });

  modifierKeys.forEach(key => {
    oldNode.setChild(key, assignNode(newNode.getChild(key)!, oldNode.getChild(key)!, mutateFn));
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
