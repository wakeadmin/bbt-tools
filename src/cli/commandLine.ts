import { CommandLineParser } from '@rushstack/ts-command-line';
import { JSONFileParser } from '../utils';
import { BuildAction } from './buildAction';
import { CollectionAction } from './collectionAction';
import { InitAction } from './initAction';
import { TranslateAction } from './translateAction';
import { UpdateAction } from './updateAction';
import { VersionAction } from './versionAction';
import { SetGlobalConfigAction } from './setAction';

export class BBTToolCommandLineParser extends CommandLineParser {
  constructor() {
    super({
      toolFilename: 'wkbbt',
      toolDescription: '国际化资源工具库',
    });
    this.populateActions();
  }

  protected onDefineParameters(): void {
    // noop
  }

  private populateActions(): void {
    this.addAction(new InitAction());
    this.addAction(new CollectionAction());
    this.addAction(new BuildAction());
    this.addAction(new TranslateAction());
    this.addAction(new VersionAction());
    this.addAction(new UpdateAction());
    this.addAction(new SetGlobalConfigAction());
  }
}
