export const ArrayLikeReg = /^\[[\s\S]+\]$/;

export interface FileParser<T = any> {
  parse(str: string): Record<string, T>;
  stringify(record: Record<string, T>): string;
}

export class JSONFileParser implements FileParser {
  parse(str: string): Record<string, any> {
    return JSON.parse(str);
  }

  stringify(record: Record<string, any>): string {
    return JSON.stringify(record, null, 2);
  }
}
