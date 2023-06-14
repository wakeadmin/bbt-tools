export * from './google';
export * from './base';
export * from './deepl';

export const enum TranslatorListEnum {
  Google = 'google',
  DeepL = 'deepl',
}

export type TranslatorAlternatives = `${TranslatorListEnum}`;
