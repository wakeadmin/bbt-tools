import { LangKeyExistedError } from '../error';
import { ArrayLikeReg } from './parser';

export function flatObject(
  obj: Record<string, any>,
  options: {
    prefix?: string;
    path?: string;
  } = {}
): Record<string, string> {
  const list = [
    {
      data: obj,
      prefix: options.prefix,
    },
  ];
  const result: Record<string, string> = {};

  while (true) {
    const { data, prefix: objectPrefix } = list.shift() || {};
    if (!data) {
      return result;
    }

    for (const [key, value] of Object.entries(data)) {
      const prefix = `${objectPrefix ? objectPrefix + '.' : ''}` + key;
      if (isObject(value)) {
        list.push({
          data: value,
          prefix,
        });
      } else {
        if (result[prefix]) {
          throw new LangKeyExistedError(prefix, options.path as string, options.path as string);
        }
        result[prefix] = value;
      }
    }
  }
}

/**
 * 转换字符串为数组
 *
 * 如果转换失败，那么将返回原字符串
 *
 *
 * @example
 * ```js
 *  strToArray(`丹唇外朗，皓齿内鲜`); //  "丹唇外朗，皓齿内鲜"
 *  strToArray('髣髴兮若轻云之蔽月，飘飖兮若流风之回雪'); //  "髣髴兮若轻云之蔽月，飘飖兮若流风之回雪"
 *  strToArray('披罗衣之璀粲兮，珥瑶碧之华琚'); // "披罗衣之璀粲兮，珥瑶碧之华琚"
 *  strToArray('微幽兰之芳蔼兮，步踟蹰于山隅'); // "微幽兰之芳蔼兮，步踟蹰于山隅"
 *  strToArray(`SSS's`); //  "SSS's"
 *  strToArray(`['足往心留。遗情想像', '思绵绵而增慕。夜耿耿而不寐']`); //  ['足往心留。遗情想像', '思绵绵而增慕。夜耿耿而不寐']
 * ```
 *
 * @param str
 */
export function strToArray(str: string): string | any[] {
  if (ArrayLikeReg.test(str)) {
    try {
      return JSON.parse(str);
    } catch (_) {
      // noop
    }
  }

  return str;
}

export function isObject(value: any): Boolean {
  return Object.prototype.toString.call(value) === '[object Object]';
}

export function setMapValueIfNeed<K, V>(map: Map<K, V>, key: K, value: V): void {
  if (map.has(key)) {
    return undefined;
  }
  map.set(key, value);
}

export function setObjectValueIfNeed<T extends object, K extends keyof T>(o: T, key: K, value: T[K]): void {
  if (Object.getOwnPropertyDescriptor(o, key)) {
    return undefined;
  }
  o[key] = value;
}

export type MapKeyValue<T> = T extends Map<infer K, infer V> ? [K, V] : unknown;
export type MapKey<T> = T extends Map<infer K, any> ? K : unknown;
export type MapValue<T> = T extends Map<any, infer V> ? V : unknown;
