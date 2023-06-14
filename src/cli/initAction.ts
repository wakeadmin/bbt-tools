import { CommandLineAction } from '@rushstack/ts-command-line';
import chalk from 'chalk';
import logSymbols from 'log-symbols';
import path from 'path';
import { createProjectConfig } from '../utils/config';

export class InitAction extends CommandLineAction {
  constructor() {
    super({
      actionName: 'init',
      summary: '初始化',
      documentation: '初始化项目, 生成默认的配置文件',
    });
  }

  protected onDefineParameters(): void {
    // noop
  }

  protected async onExecute(): Promise<void> {
    this.createConfigFile();
  }

  private createConfigFile() {
    const configPath = path.join(process.cwd(), './bbt.config.js');

    createProjectConfig(configPath);
    
    console.log(logSymbols.success, chalk.green('创建配置文件成功'));
  }
}
