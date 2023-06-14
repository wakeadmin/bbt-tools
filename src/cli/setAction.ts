import { CommandLineAction, CommandLineStringParameter } from '@rushstack/ts-command-line';
import chalk from 'chalk';
import { getGlobalConfig, setGlobalConfig } from '../utils/config';

export class SetGlobalConfigAction extends CommandLineAction {
  private setParameter!: CommandLineStringParameter;
  private getParameter!: CommandLineStringParameter;

  constructor() {
    super({
      actionName: 'config',
      summary: '设置全局配置',
      documentation: '持久化设置全局配置',
    });
  }

  protected onDefineParameters(): void {
    this.setParameter = this.defineStringParameter({
      parameterLongName: '--set',
      parameterShortName: '-s',
      argumentName: 'NAMEVALUE',
      description: '设置全局配置, --set <name>=<value>',
    });
    this.getParameter = this.defineStringParameter({
      parameterLongName: '--get',
      parameterShortName: '-g',
      argumentName: 'NAME',
      description: '获取全局配置',
    });
  }

  protected async onExecute(): Promise<void> {
    if (this.getParameter.value) {
      return console.log(getGlobalConfig(this.getParameter.value as any));
    }

    if (this.setParameter.value) {
      const { name, value } = this.parseSetValue(this.setParameter.value);
      setGlobalConfig(name as any, value);
      console.log(chalk.rgb(2, 46, 86)(`设置成功`));
    }
  }

  private parseSetValue(str: string): {
    name: string;
    value: string;
  } {
    const [name, ...values] = str.split('=');
    if (name && values) {
      return {
        name,
        value: values.join('='),
      };
    }
    throw new Error('传入的格式不正确');
  }
}
