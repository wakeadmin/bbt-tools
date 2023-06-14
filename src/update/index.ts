import { getFiles } from '../utils';
import { updateProjectConfig } from '../utils/config';
import { MigrateActions } from './data/targetVersion';
import { getLocalPackageVersion } from './tools/package';

function findConfigFiles(): string[] {
  return getFiles(
    process.cwd(),
    ['dist', 'node_modules'],
    file => file.isFile() && file.name.endsWith('bbt.config.js')
  ).map(file => file.name);
}

function getLocalPackageMajorVersion(): number {
  const version = getLocalPackageVersion();
  return +version.split('.')[0];
}

function getUpdateActions(currentVersion: string): ((configFile: string, basePath: string) => Promise<any>)[] {
  const currentMajorVersion = +currentVersion.split('.')[0].replace(/[^\d]/g, '');

  const localMajorVersion = getLocalPackageMajorVersion();

  if (localMajorVersion > currentMajorVersion) {
    const actions = Object.values(MigrateActions);

    return actions.slice(currentMajorVersion, localMajorVersion);
  }
  return [];
}

function updateConfigVersion(configPath: string): void {
  updateProjectConfig(configPath, '__version', getLocalPackageVersion());
}

export async function migrate(currentVersion: string, configFile: string, basePath: string = process.cwd()) {
  const file = configFile ?? findConfigFiles()[0];
  const updateActions = getUpdateActions(currentVersion);

  // TODO 将所有的操作存在内存中 最后一次性应用所有的操作 减少io
  for (const action of updateActions) {
    await action(file, basePath);
  }

  updateConfigVersion(file);
}
