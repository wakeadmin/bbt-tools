export function assignKeys(a: string[], b: string[]): Set<string> {
  return new Set([...a, ...b]);
}

export function filterRemoveKey(keys: Set<string>): Set<string> {
  const set = new Set(keys);
  for (const key of keys) {
    if (key.endsWith('@remove@')) {
      set.delete(key);
      set.delete(key.substring(0, -8));
    }
  }
  return set;
}

export function setToArray<T>(set: Set<T>): T[] {
  return [...set.values()];
}
