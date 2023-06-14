import logSymbols from 'log-symbols';

interface IKeyTreeNode<T extends {}> {
  getChild(key: string): any;
  has(key: string): boolean;
  addChild(key: string, valueOrNode: KeyTreeNodeType | KeyTreeNode<T>, type?: KeyTreeNodeType): void;
}

export class ExistedKeyError extends Error {
  constructor(key: string) {
    super(`${logSymbols.error} 存在相同的key -> [${key}]`);
  }
}

export class NullKeyError extends Error {
  constructor(key: string) {
    super(`${logSymbols.error} 指定 key [${key}] 不存在， 请使用 addChild 进行添加`);
  }
}

export class IllegalOperationOfAddChildError extends Error {
  constructor(type: KeyTreeNodeType, key: string) {
    super(`违规操作：无法新增子节点, 当前 key (${key}) 的类型为 [${type}]`);
  }
}
export class IllegalOperationOfValueError extends Error {
  constructor(type: KeyTreeNodeType, key: string) {
    super(`违规操作：无法设置子节点的值, 当前 key (${key}) 的类型为 [${type}]`);
  }
}

export const enum KeyTreeNodeType {
  'Leaf',
  'Node',
  'Root',
}

export class KeyTreeNode<T extends {}> implements IKeyTreeNode<T> {
  private allowAddChild: boolean;
  private child: Map<string, KeyTreeNode<T>> = new Map();
  private value!: T;
  fullKey!: string;
  private parentNode!: KeyTreeNode<T>;
  /**
   *
   * @param key - key
   * @param type - 节点类型 只有`object`和`array`才允许添加子节点
   */
  constructor(public readonly key: string, private type: KeyTreeNodeType) {
    this.allowAddChild = type !== KeyTreeNodeType.Leaf;
  }

  get nodeType() {
    return this.type;
  }

  set nodeType(type: KeyTreeNodeType) {
    if (type !== this.type) {
      this.type = type;
      // @ts-expect-error
      this.value = {};
      this.clear();
      this.allowAddChild = type !== KeyTreeNodeType.Leaf;
    }
  }

  get children() {
    return [...this.child.values()];
  }

  get parent(): KeyTreeNode<T> {
    return this.parentNode;
  }

  set parent(node: KeyTreeNode<T>) {
    if (node !== this.parentNode) {
      this.parentNode = node;
      this.fullKey = this.parent?.fullKey ? `${this.parent.fullKey}.${this.key}` : this.key;
    }
  }

  appendChild(key: string, node: KeyTreeNode<T>): void {
    if (!this.allowAddChild) {
      throw new IllegalOperationOfAddChildError(this.type, key);
    }
    if (!this.has(key)) {
      throw new NullKeyError(key);
    }

    this.child.set(key, node);
  }

  getChild(key: string): KeyTreeNode<T> | null {
    return this.child.get(key) ?? null;
  }

  getParent(): KeyTreeNode<T> | null {
    return this.parent;
  }

  getValue() {
    return this.value;
  }

  isLeaf() {
    return this.nodeType === KeyTreeNodeType.Leaf;
  }

  has(key: string): boolean {
    return this.child.has(key);
  }

  addChild(key: string, nodeOrType: KeyTreeNode<T> | KeyTreeNodeType): KeyTreeNode<T> {
    if (!this.allowAddChild) {
      throw new IllegalOperationOfAddChildError(this.type, key);
    }
    if (this.has(key)) {
      throw new ExistedKeyError(key);
    }

    const node = typeof nodeOrType === 'object' ? nodeOrType : new KeyTreeNode<T>(key, nodeOrType);
    this.child.set(key, node);
    node.parent = this;
    return node;
  }

  setValue(value: T): void {
    if (this.allowAddChild) {
      throw new IllegalOperationOfValueError(this.type, this.key);
    }
    this.value = value;
  }

  mutate(fn: (val: T) => T): void {
    if (this.allowAddChild) {
      return;
    }
    this.setValue(fn(this.value));
  }

  assign(value: Partial<T>): void {
    if (this.allowAddChild) {
      return;
    }
    this.mutate(originValue => ({
      ...originValue,
      ...value,
    }));
  }

  visitor(fn: (node: KeyTreeNode<T>) => void): void {
    fn(this);
    if (this.isLeaf()) {
      return;
    }
    this.child.forEach(node => node.visitor(fn));
  }

  clone() {
    const node = new KeyTreeNode<T>(this.key, this.nodeType);

    this.child.forEach(child => {
      node.addChild(child.key, child.clone());
    });

    node.mutate(() => this.getValue());
    return node;
  }

  clear() {
    this.child.clear();
  }
}

/**
 * 翻译信息的key的字典树
 * 用来判断key是否存在
 */
export class KeyTree<T extends {}> {
  private readonly rootNode = this.createRootNode();

  get root() {
    return this.rootNode;
  }

  get children() {
    return this.rootNode.children;
  }

  has(key: string): boolean {
    return !!this.get(key);
  }

  /**
   * 新增节点
   *
   * @param key - key
   * @param value - value
   * @param type - 节点类型
   * @param recursive - 是否循环设置 如果为`false` 那么找不到父级的节点话 将会抛出一个错误， 为`true`的话 如果父级为空 那么会新增一个默认节点上去
   */
  add(key: string, type: KeyTreeNodeType = KeyTreeNodeType.Node, recursive: boolean = true): KeyTreeNode<T> {
    const { parent, key: child } = this.parseKey(key);

    if (!parent) {
      return this.rootNode.addChild(child, type);
    }

    if (recursive) {
      return this.safeAdd(key, type);
    }

    const node = this.get(parent);
    if (!node) {
      throw new Error(`无法设置 ${key} ; 其父节点为 null`);
    }

    return node.addChild(child, type);
  }

  get(key: string): KeyTreeNode<T> | null {
    let node: KeyTreeNode<T> | null = this.rootNode;
    const keyList = key.split('.');
    for (const name of keyList) {
      node = node.getChild(name);
      if (!node) {
        break;
      }
    }
    return node;
  }

  visitor(fn: (node: KeyTreeNode<T>) => void): void {
    this.children.forEach(child => child.visitor(fn));
  }

  clone() {
    const tree = new KeyTree<T>();

    this.children.forEach(node => {
      tree.rootNode.addChild(node.key, node.clone());
    });

    return tree;
  }

  private createRootNode() {
    return new KeyTreeNode<T>('__S_Root', KeyTreeNodeType.Root);
  }

  private safeAdd(key: string, type: KeyTreeNodeType = KeyTreeNodeType.Node): KeyTreeNode<T> {
    const keyList = key.split('.');
    const addKey = keyList.pop()!;
    let node: KeyTreeNode<T> = this.rootNode;
    for (const k of keyList) {
      if (!node.has(k)) {
        node.addChild(k, KeyTreeNodeType.Node);
      }
      node = node.getChild(k)!;
    }

    return node.addChild(addKey, type);
  }

  private parseKey(key: string): {
    parent: string;
    key: string;
  } {
    const str = key.trim();
    if (str.startsWith('.') || str.endsWith('.')) {
      throw new Error(`${key} 格式不正确，请确保是以'.'符号分割以及非空字符`);
    }
    const [source, parentKey, childKey] = str.split(/([\w.]+)\.([\w@]+)$/);

    if (source === str) {
      return {
        parent: '',
        key,
      };
    }

    return {
      parent: parentKey,
      key: childKey,
    };
  }
}
