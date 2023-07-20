import {
  CommandLineChoiceParameter,
  CommandLineFlagParameter,
  CommandLineStringParameter,
} from '@rushstack/ts-command-line';
import ora from 'ora';
import { concatMap, from, lastValueFrom, share } from 'rxjs';
import {
  ENV_DEEPL_API_KEY,
  ENV_DEEPL_BASE_URL,
  ENV_GOOGLE_API_KEY,
  ENV_GOOGLE_BASE_URL,
  ENV_OPEN_AI_API_KEY,
  ENV_OPEN_AI_BASE_URL,
  ENV_PROXY,
} from '../constanst/env';
import {
  ChatGPTModel,
  ChatGPTTranslator,
  DeepLTranslator,
  GoogleTranslator,
  ITranslator,
  TranslatorAlternatives,
  TranslatorListEnum,
} from '../translator';
import { KeyTree } from '../utils';
import { IBBTValue, getExcelCtor } from '../utils/treeExcel';
import { BaseAction } from './baseAction';

const alternatives: TranslatorAlternatives[] = ['google', 'deepl', 'chatgpt'];

const API_KEY_ENV_NAME_MAP = new Map<
  TranslatorAlternatives,
  {
    api: string;
    baseUrl: string;
  }
>([
  ['chatgpt', { api: ENV_OPEN_AI_API_KEY, baseUrl: ENV_OPEN_AI_BASE_URL }],
  ['deepl', { api: ENV_DEEPL_API_KEY, baseUrl: ENV_DEEPL_BASE_URL }],
  ['google', { api: ENV_GOOGLE_API_KEY, baseUrl: ENV_GOOGLE_BASE_URL }],
]);

export interface ITranslateTextSource {
  [target: string]: {
    sourceText: string | string[];
    target: string;
    translatedText: string | string[];
    key: string;
    sourceLanguage: string;
  }[];
}
export class TranslateAction extends BaseAction {
  private translationParameter!: CommandLineChoiceParameter;
  private proxyParameter!: CommandLineStringParameter;
  private apiKeyParameter!: CommandLineStringParameter;
  private baseURLParameter!: CommandLineStringParameter;
  private globalTranslateParameter!: CommandLineFlagParameter;
  private chatGPTModelParameter!: CommandLineChoiceParameter;
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
      environmentVariable: ENV_PROXY,
      description: '正向代理地址',
      argumentName: 'PROXY',
    });
    this.globalTranslateParameter = this.defineFlagParameter({
      parameterLongName: '--global',
      parameterShortName: '-g',
      description: '是否执行全局翻译',
    });

    this.chatGPTModelParameter = this.defineChoiceParameter({
      parameterLongName: '--gm',
      alternatives: [ChatGPTModel['gpt3.5'], ChatGPTModel.gpt4],
      description: '使用的chatgpt model',
      defaultValue: ChatGPTModel['gpt3.5'],
    });

    this.apiKeyParameter = this.defineStringParameter({
      parameterLongName: '--api-key',
      parameterShortName: '-k',
      description: '翻译服务的API Key',
      argumentName: 'KEY',
    });

    this.baseURLParameter = this.defineStringParameter({
      parameterLongName: '--base-url',
      description: '反向代理地址',
      argumentName: 'URL',
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

      const tree = (await this.readExcel()).toTree();

      await this.translate(spinner, tree);

      const output = getExcelCtor(this.config.bbtExcelPath).fromTree(tree, this.config.langs);

      output.save(this.config.bbtExcelPath);

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
        const sourceText = value[sourceLanguage];
        for (const target of targetLanguages) {
          translateTexts[target].push({
            sourceLanguage,
            sourceText,
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

  private async translate(spinner: ora.Ora, tree: KeyTree<IBBTValue>): Promise<void> {
    const translateFunction = this.getTranslateFunction();

    const textSource = this.getTranslateTexts(tree);
    const length = Object.values(textSource).reduce((acc, list) => (acc += list.length), 0);
    if (length === 0) {
      return;
    }

    let i = 0;

    spinner.text = '正在进行翻译 - 0%';

    const translateText$ = from([textSource]).pipe(
      concatMap(obj =>
        from(
          Object.values(obj).map(list => {
            const textMap: Record<string, string | string[]> = {};
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
      concatMap(({ target, textMap, sourceLanguage }) => translateFunction(textMap, target, sourceLanguage)),
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

  private getTranslateFunction(): ITranslator['translate'] {
    const customTranslator = this.config.plugins?.translator;
    if (customTranslator) {
      return (textMap, target, sourceLanguage) => from(customTranslator(textMap, target, sourceLanguage!));
    }
    const provider = this.createTranslationService(this.translationParameter.value as unknown as TranslatorListEnum);

    if (provider instanceof ChatGPTTranslator && this.chatGPTModelParameter.value) {
      provider.useModel(this.chatGPTModelParameter.value as any);
    }

    return provider.translate.bind(provider);
  }

  private createTranslationService(provider: TranslatorAlternatives): ITranslator {
    const { apiKey, ...config } = this.getTranslatorConfig();
    switch (provider) {
      case TranslatorListEnum.Google:
        return new GoogleTranslator(apiKey, config);
      case TranslatorListEnum.DeepL:
        return new DeepLTranslator(apiKey, config);
      case TranslatorListEnum.ChatGPT:
        return new ChatGPTTranslator(apiKey, config);
      default:
        throw new Error('无法找到对应的翻译提供者');
    }
  }

  private getTranslatorConfig(): {
    apiKey: string;
    baseUrl?: string;
    proxy?: string;
  } {
    const { api, baseUrl: url } = API_KEY_ENV_NAME_MAP.get(
      this.translationParameter.value as any as TranslatorAlternatives
    )!;

    const apiKey = this.apiKeyParameter.value || process.env[api];
    const baseUrl = this.baseURLParameter.value || process.env[url];

    if (apiKey) {
      return {
        apiKey,
        baseUrl,
        proxy: this.proxyParameter.value,
      };
    }
    throw new Error(`缺少 API_KEY, 请传入 --key 参数或者设置环境变量 ${api}`);
  }
}
