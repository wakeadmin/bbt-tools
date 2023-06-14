import { CommandLineAction } from '@rushstack/ts-command-line';
import chalk from 'chalk';
import { readFileSync } from 'fs-extra';
import { resolve } from 'path';
import { readPackageJson } from '../utils/package';

export class VersionAction extends CommandLineAction {
  constructor() {
    super({
      actionName: 'version',
      summary: '当前版本',
      documentation: '打印当前版本号',
    });
  }

  protected onDefineParameters(): void {
    // noop
  }

  protected async onExecute(): Promise<void> {
    this.printLogo();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const packageInfo = readPackageJson(resolve(__dirname, '../../package.json'))!;
    console.log(chalk.rgb(62, 18, 106)(`@wakeadmin/bbt-tools version: ${packageInfo.version}`));
  }

  private printLogo(): void {
    console.log(chalk.rgb(62, 18, 106)(readFileSync(resolve(__dirname, '../template/logo.txt'))));
  }
}
