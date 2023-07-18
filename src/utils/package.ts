import { readFileSync } from 'fs-extra';

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

export function readPackageJson(pkgPath: string): PackageManifest | undefined {
  const content = readFileSync(pkgPath, 'utf-8');
  if (content) {
    return JSON.parse(content);
  }
  return undefined;
}
