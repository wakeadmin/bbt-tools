import { resolve } from 'path';
import { readPackageJson } from '../../utils/package';

let pkgVersion: string | undefined;

export function getLocalPackageVersion(): string {
  if (pkgVersion) {
    return pkgVersion;
  }
  const pkgPath = resolve(__dirname, '../../../package.json');

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  pkgVersion = readPackageJson(pkgPath)!.version;
  return pkgVersion;
}
