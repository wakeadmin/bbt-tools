export * from './google';
export * from './base';
export * from './deepl';
export * from './chatgpt';

export const enum TranslatorListEnum {
  Google = 'google',
  DeepL = 'deepl',
  ChatGPT = 'chatgpt',
}

export type TranslatorAlternatives = `${TranslatorListEnum}`;
