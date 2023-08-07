import { CommandLineParser } from '@rushstack/ts-command-line';
import { CollectAction } from './collectAction';
import { InitAction } from './initAction';
import { TranslateAction } from './translateAction';
import { VersionAction } from './versionAction';
import { WriteAction } from './writeAction';

export class BBTToolCommandLineParser extends CommandLineParser {
  constructor() {
    super({
      toolFilename: 'bbt',
      toolDescription: '一个自动化的语言包管理和翻译工具',
    });
    this.populateActions();
  }

  protected onDefineParameters(): void {
    // noop
  }

  private populateActions(): void {
    this.addAction(new InitAction());
    this.addAction(new CollectAction());
    this.addAction(new TranslateAction());
    this.addAction(new WriteAction());
    this.addAction(new VersionAction());
  }
}
