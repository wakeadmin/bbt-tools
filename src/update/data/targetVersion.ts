import { updateV1 } from './V1';

export enum TargetVersion {
  V1 = 'version 1',
}

export const MigrateActions: Record<`${TargetVersion}`, (configFile: string, basePath: string) => Promise<any>> = {
  [TargetVersion.V1]: updateV1,
};
