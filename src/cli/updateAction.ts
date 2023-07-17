/* eslint-disable import/no-dynamic-require */
import { CommandLineStringParameter } from '@rushstack/ts-command-line';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs-extra';
import path from 'path';
import {
  fetchPackageMeta,
  getPackageManager,
  getProjectDependencies,
  install,
  PackageManifest,
  readPackageJson,
} from '../utils/package';
import { DiffModeEnum } from '../utils';
import { BaseAction } from './baseAction';

export interface BBTConfig {
  langs: string[];
  resourcePath: string;
  test: string;
  src: string;
  exclude: string[];
  bbtExcelPath: string;
  generateExportFile: boolean;
  exportFileName: string;
  diffMode: DiffModeEnum;
  outFileExtName: string;
}

export class UpdateAction extends BaseAction {
  private registryParameter!: CommandLineStringParameter;
  private currentVersion: string | null = null;
  constructor() {
    super({
      actionName: 'update',
      summary: '升级版本',
      documentation: '升级版本',
    });
  }

  protected onDefineParameters(): void {
    super.onDefineParameters();
    this.registryParameter = this.defineStringParameter({
      parameterLongName: '--registry',
      parameterShortName: '-r',
      argumentName: 'REGISTRY',
      description: 'npm源地址',
    });
  }

  protected async onExecute(): Promise<void> {
    super.onExecute();
    if (!this.checkCleanGit()) {
      throw new Error('请确保当前仓库没有内容变更!');
    }
    const pkgPath = path.resolve(process.cwd(), './package.json');
    const pkg = readPackageJson(pkgPath);
    try {
      const packageMeta = await this.getUpdatePackage();
      if (packageMeta) {
        await install(`${packageMeta.name}@${packageMeta.version}`, 'devDependencies');
        await this.migrate(packageMeta);
        this.printLogo();
        return console.log(chalk.green('升级成功'));
      }

      console.log('无须升级');
    } catch (e) {
      console.error('升级失败：', e);
      // 还原pkg;
      if (pkg) {
        writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
      }
      throw e;
    }
  }

  private async migrate(packageMeta: PackageManifest): Promise<void> {
    if (!packageMeta.update) {
      return undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(path.join(process.cwd(), './node_modules/@wakeadmin/bbt/scripts/migration'));
    await mod.migrate(this.getCurrentVersion(), this.configPathParameter.value);
  }

  private async getUpdatePackage(): Promise<PackageManifest | undefined> {
    const currentVersion = this.getCurrentVersion();

    console.log(chalk.green('正在获取最新版本'));

    const packageManager = await getPackageManager();
    const packageMeta = await fetchPackageMeta(
      '@wakeadmin/bbt',
      packageManager.name === 'yarn',
      this.registryParameter.value
    );

    const latest = packageMeta.tags.latest;
    if (!latest) {
      return undefined;
    }

    if (this.needUpdate(currentVersion, latest.version)) {
      return latest;
    }
  }

  private needUpdate(currentVersion: string, targetVersion: string): boolean {
    const arr1 = currentVersion.split('.').map(str => +str.replace(/[\^~a-z]/gi, ''));
    const arr2 = targetVersion.split('.').map(str => +str.replace(/[a-z]/gi, ''));

    for (let i = 0; i < arr1.length; i++) {
      if (arr2[i] > arr1[i]) {
        return true;
      }
      if (arr2[i] < arr1[1]) {
        return false;
      }
    }
    return false;
  }

  private getCurrentVersion(): string {
    /**
     * 对1.0.X之前的版本进行适配
     */
    if (this.currentVersion) {
      return this.currentVersion;
    }
    if (this.config.__version) {
      return this.config.__version;
    }

    const dependencies = getProjectDependencies(path.resolve(process.cwd(), './package.json'));

    this.currentVersion = dependencies.get('@wakeadmin/bbt')?.version;
    if (!this.currentVersion) {
      throw new Error(`该项目没有安装 @wakeadmin/bbt`);
    }
    return this.currentVersion;
  }

  private checkCleanGit(): boolean {
    const result = execSync('git status --porcelain', { encoding: 'utf8', stdio: 'pipe' });

    return result.trim().length === 0;
  }

  private printLogo(): void {
    console.log(chalk.rgb(62, 18, 106)(readFileSync(path.resolve(__dirname, '../template/logo.txt'))));
  }
}
