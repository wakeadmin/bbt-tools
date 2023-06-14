import lockfile from '@yarnpkg/lockfile';
import chalk from 'chalk';
import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs-extra';
import ini from 'ini';
import ora from 'ora';
import pacote from 'pacote';
import path from 'path';
import { NotFileError } from '../error';

function support(name: string): boolean {
  try {
    execSync(`${name} --version`, {
      stdio: 'ignore',
      env: { NO_UPDATE_NOTIFIER: '1', NPM_CONFIG_UPDATE_NOTIFIER: 'false' },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * 判断当前目录是否为`workspace`根目录
 *
 *
 * @remarks
 * 目前只有`pnpm`原生支持 因此只考虑`pnpm`的情况
 *
 */
function isWorkspaceRoot(): boolean {
  return existsSync(path.join(process.cwd(), 'pnpm-workspace.yaml'));
}

interface PackageCommands {
  name: string;
  commands: {
    prefix: string;
    installPackage: string;
    saveDev: string;
    silent: string;
    workSpaceRoot: string;
  };
}

const packageManagers: { [name: string]: PackageCommands } = {
  npm: {
    name: 'npm',
    commands: {
      prefix: '--prefix',
      silent: '--quiet',
      installPackage: 'install',
      saveDev: '--save-dev',
      workSpaceRoot: '',
    },
  },
  yarn: {
    name: 'yarn',
    commands: {
      prefix: '--modules-folder',
      silent: '--silent',
      installPackage: 'add',
      saveDev: '--dev',
      workSpaceRoot: '',
    },
  },
  pnpm: {
    name: 'pnpm',
    commands: {
      prefix: '--prefix',
      silent: '--silent',
      installPackage: 'add',
      saveDev: '--save-dev',
      workSpaceRoot: '--workspace-root',
    },
  },
};

export async function getPackageManager() {
  const hasPnpm = support('pnpm');
  const hasYarn = support('yarn');
  const hasNpm = support('npm');
  const hasPnpmLock = existsSync(path.join(process.cwd(), 'pnpm-lock.yaml'));
  const hasYarnLock = existsSync(path.join(process.cwd(), 'yarn.lock'));
  const hasNpmLock = existsSync(path.join(process.cwd(), 'package-lock.json'));

  /**
   * 优先使用配套的
   */
  if (hasPnpm && hasPnpmLock) {
    return packageManagers.pnpm;
  } else if (hasYarn && hasYarnLock) {
    return packageManagers.yarn;
  } else if (hasNpm && hasNpmLock) {
    return packageManagers.npm;
  }

  /**
   * 没有配套的 就按顺序 哪个有 用那个
   */
  if (hasPnpm) {
    return packageManagers.pnpm;
  } else if (hasYarn) {
    return packageManagers.yarn;
  }

  return packageManagers.npm;
}

export async function install(
  packgaeName: string,
  save: 'dependencies' | 'devDependencies',
  extraArgs: string[] = [],
  cwd?: string
) {
  const packageManager = await getPackageManager();
  console.log(chalk.green('当前包管理软件：', packageManager.name));

  const commands = packageManager.commands;
  const args = [commands.installPackage, packgaeName, commands.silent];

  if (packageManager.name === 'pnpm' && isWorkspaceRoot()) {
    console.log(chalk.rgb(58, 22, 110)('当前安装模式 -> workspace root'));
    args.push(packageManager.commands.workSpaceRoot);
  }

  if (save === 'devDependencies') {
    args.push(commands.saveDev);
  }

  const spinner = ora({
    text: '正在安装依赖',
    spinner: 'dots8Bit',
  });
  spinner.start();

  const exec = () =>
    new Promise<void>((resolve, reject) => {
      spawn(packageManager.name, [...args, ...(extraArgs || [])], {
        stdio: 'ignore',
        shell: true,
        cwd,
      }).on('close', (code: number) => {
        if (code === 0) {
          spinner.succeed('安装成功');
          return resolve();
        }
        spinner.fail('安装失败');
        return reject(new Error('安装失败'));
      });
    });
  await exec();
}

function getNpmrc(yarn: boolean = false) {
  const fileName = '.' + (yarn ? 'yarnrc' : 'npmrc');

  let options: Record<string, string> = {};
  if (existsSync(fileName)) {
    const data = readFileSync(fileName, 'utf-8');
    options = yarn ? lockfile.parse(data) : ini.parse(data);
  }

  return options;
}

export interface PackageDependencies {
  [dependency: string]: string;
}
export interface PackageMetadata {
  name: string;
  tags: { [tag: string]: PackageManifest | undefined };
  versions: Record<string, PackageManifest>;
  'dist-tags'?: {
    latest?: string;
    next?: string;
    [key: string]: string | undefined;
  };
}
export interface PackageManifest {
  name: string;
  version: string;
  license?: string;
  private?: boolean;
  deprecated?: boolean;
  update?: any;
  dependencies: PackageDependencies;
  devDependencies: PackageDependencies;
  peerDependencies: PackageDependencies;
  optionalDependencies: PackageDependencies;
}

export async function fetchPackageMeta(name: string, useYarn: boolean, registry?: string): Promise<PackageMetadata> {
  const npmrc = getNpmrc(useYarn);
  const res = await pacote.packument(name, { fullMetadata: true, ...npmrc, ...(registry ? { registry } : {}) });
  const metadata: PackageMetadata = {
    name: res.name,
    tags: {},
    versions: {},
  };

  if (res.versions) {
    for (const [version, manifest] of Object.entries(res.versions)) {
      metadata.versions[version] = {
        name: manifest.name,
        version: manifest.version,
      } as any;
    }
  }

  if (res['dist-tags']) {
    metadata['dist-tags'] = res['dist-tags'];
    for (const [tag, version] of Object.entries(res['dist-tags'])) {
      const manifest = res.versions[version];
      if (manifest) {
        metadata.tags[tag] = manifest as any as PackageManifest;
      } else {
        console.warn(`Package ${metadata.name} has invalid version metadata for '${tag}'.`);
      }
    }
  }
  return metadata;
}

function getAllDependencies(
  pkg: PackageManifest
): Map<
  string,
  { version: string; dependencies: 'dependencies' | 'optionalDependencies' | 'peerDependencies' | 'devDependencies' }
> {
  const map = new Map<string, any>();

  const allDependencies = new Set([
    ...Object.entries(pkg.dependencies || []).map(item => [...item, 'dependencies']),
    ...Object.entries(pkg.optionalDependencies || []).map(item => [...item, 'optionalDependencies']),
    ...Object.entries(pkg.peerDependencies || []).map(item => [...item, 'peerDependencies']),
    ...Object.entries(pkg.devDependencies || []).map(item => [...item, 'devDependencies']),
  ]);

  for (const [name, version, dependencies] of allDependencies) {
    map.set(name, {
      version,
      dependencies,
    });
  }

  return map;
}

export function readPackageJson(pkgPath: string): PackageManifest | undefined {
  const content = readFileSync(pkgPath, 'utf-8');
  if (content) {
    return JSON.parse(content);
  }
  return undefined;
}

export function getProjectDependencies(pkgPath: string): Map<string, any> {
  const pkg = readPackageJson(pkgPath);

  if (!pkg) {
    throw new NotFileError(pkgPath);
  }

  return getAllDependencies(pkg);
}
