import { CommandLineAction, CommandLineStringParameter } from '@rushstack/ts-command-line';
import path from 'path';
import { BBTExcel, FileParser, IBBTValue, JSONFileParser, getExcel } from '../utils';
import { IBBTProjectConfig, getDefaultProjectConfig, getProjectConfig } from '../utils/config';

export abstract class BaseAction extends CommandLineAction {
  protected configPathParameter!: CommandLineStringParameter;
  protected config!: IBBTProjectConfig;
  protected readonly basePath = process.cwd();
  protected parser!: FileParser;

  protected onDefineParameters(): void {
    this.configPathParameter = this.defineStringParameter({
      parameterLongName: '--config',
      parameterShortName: '-c',
      argumentName: 'CONFIGPATH',
      description: 'bbt.config.js文件路径',
      defaultValue: path.join(process.cwd(), './bbt.config.js'),
    });
  }

  protected async onExecute(): Promise<void> {
    this.config = this.readConfig();
    this.parser = this.getParser();
  }

  private readConfig(): IBBTProjectConfig {
    const configPath = this.configPathParameter.value!;
    return {
      ...getDefaultProjectConfig(),
      ...getProjectConfig(configPath),
    };
  }

  protected readExcel<T extends IBBTValue>(): Promise<BBTExcel<T>> {
    const { bbtExcelPath } = this.config;
    const excel = getExcel(bbtExcelPath);
    return excel;
  }

  protected getParser(): FileParser {
    return this.config?.plugins?.parser || new JSONFileParser();
  }
}
