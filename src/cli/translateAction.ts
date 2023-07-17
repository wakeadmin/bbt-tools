import {
  CommandLineChoiceParameter,
  CommandLineFlagParameter,
  CommandLineStringParameter,
} from '@rushstack/ts-command-line';
import ora from 'ora';
import { concatMap, from, lastValueFrom, share } from 'rxjs';
import {
  DeepLTranslator,
  GoogleTranslator,
  ITranslator,
  TranslatorAlternatives,
  TranslatorListEnum,
} from '../translate';
import { KeyTree } from '../utils';
import { getGlobalConfig } from '../utils/config';
import { IBBTValue } from '../utils/treeExcel';
import { BaseAction } from './baseAction';

const alternatives: TranslatorAlternatives[] = ['google', 'deepl'];

export interface ITranslateTextSource {
  [target: string]: Record<'sourceText' | 'target' | 'translatedText' | 'key' | 'sourceLanguage', string>[];
}
export class TranslateAction extends BaseAction {
  private translationParameter!: CommandLineChoiceParameter;
  private proxyParameter!: CommandLineStringParameter;
  private globalTranslateParameter!: CommandLineFlagParameter;
  constructor() {
    super({
      actionName: 'translate',
      summary: '使用翻译API进行翻译文件',
      documentation: '使用翻译API进行翻译文件 ',
    });
  }

  protected onDefineParameters(): void {
    super.onDefineParameters();
    this.translationParameter = this.defineChoiceParameter({
      parameterLongName: '--translator',
      parameterShortName: '-t',
      alternatives,
      description: '使用哪个翻译API',
      defaultValue: TranslatorListEnum.Google,
    });
    this.proxyParameter = this.defineStringParameter({
      parameterLongName: '--proxy',
      parameterShortName: '-p',
      description: '代理地址',
      argumentName: 'PROXY',
    });
    this.globalTranslateParameter = this.defineFlagParameter({
      parameterLongName: '--global',
      parameterShortName: '-g',
      description: '是否执行全局翻译',
    });
  }

  protected async onExecute(): Promise<void> {
    await super.onExecute();

    const spinner = ora({
      text: '正在获取文件信息',
      spinner: 'dots8Bit',
    });
    try {
      spinner.start();

      spinner.text = '正在进行翻译 - 0%';

      await this.translate(spinner);

      spinner.succeed('success');
    } catch (err) {
      console.error(err);
      spinner.stop();
      throw err;
    }
  }

  private getTranslateTexts(tree: KeyTree<IBBTValue>): ITranslateTextSource {
    /**
     * 前两个值为 path key 不需要 直接丢弃
     * 第一个语言信息作为源语言
     * 其他的作为目标语言
     */
    const [sourceLanguage, ...targetLanguages] = this.config.langs;

    const translateTexts = targetLanguages.reduce<ITranslateTextSource>((obj, target) => {
      obj[target] = [];
      return obj;
    }, {});

    tree.visitor(node => {
      if (node.isLeaf()) {
        const value = node.getValue();
        for (const target of targetLanguages) {
          translateTexts[target].push({
            sourceLanguage,
            sourceText: value[sourceLanguage],
            translatedText: value[target],
            target,
            key: value.key,
          });
        }
      }
    });

    if (this.globalTranslateParameter.value) {
      return translateTexts;
    }

    const filteredRecord: ITranslateTextSource = {};
    for (const target of Object.keys(translateTexts)) {
      const textList = translateTexts[target].filter(item => !item.translatedText);
      if (textList.length === 0) {
        continue;
      }
      filteredRecord[target] = textList;
    }
    return filteredRecord;
  }

  private async translate(spinner: ora.Ora): Promise<void> {
    const translate = this.getTranslator();

    const excel = await this.readExcel();
    const tree = excel.toTree();

    const textSource = this.getTranslateTexts(tree);
    const length = Object.values(textSource).reduce((acc, list) => (acc += list.length), 0);
    if (length === 0) {
      return;
    }

    let i = 0;

    const translateText$ = from([textSource]).pipe(
      concatMap(obj =>
        from(
          Object.values(obj).map(list => {
            const textMap: Record<string, string> = {};
            for (const item of list) {
              textMap[item.key] = item.sourceText;
            }
            return {
              target: list[0].target,
              textMap,
              sourceLanguage: list[0].sourceLanguage,
            };
          })
        )
      ),
      concatMap(({ target, textMap, sourceLanguage }) => translate(textMap, target, sourceLanguage)),
      share()
    );

    translateText$.subscribe(list => {
      i += list.length;
      spinner.text = `正在进行翻译 - ${~~((i / length) * 100)}%`;
      for (const item of list) {
        tree.get(item.key)!.assign({ [item.target]: item.translatedText });
      }
    });

    await lastValueFrom(translateText$, { defaultValue: 0 });
  }

  private getTranslator(): ITranslator['translate'] {
    const customTranslator = this.config.plugins?.translator;
    if (customTranslator) {
      return (textMap, target, sourceLanguage) => from(customTranslator(textMap, target, sourceLanguage!));
    }
    return this.createTranslationService(this.translationParameter.value as unknown as TranslatorListEnum)?.translate;
  }

  private createTranslationService(provider: TranslatorAlternatives): ITranslator {
    switch (provider) {
      case TranslatorListEnum.Google:
        return new GoogleTranslator(getGlobalConfig('GoogleKey'), this.proxyParameter.value);
      case TranslatorListEnum.DeepL:
        return new DeepLTranslator(getGlobalConfig('DeepLKey'), this.proxyParameter.value);
      default:
        throw new Error('无法找到对应的翻译提供者');
    }
  }
}
