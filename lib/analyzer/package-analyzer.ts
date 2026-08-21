export interface ExtractedPackageInfo {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  optionalDependencies: Record<string, string>;
  installedVersionsFromLockfile: Record<string, string>;
}

export function parsePackageJson(packageJsonContent: string): ExtractedPackageInfo {
  const result: ExtractedPackageInfo = {
    dependencies: {},
    devDependencies: {},
    peerDependencies: {},
    optionalDependencies: {},
    installedVersionsFromLockfile: {},
  };

  try {
    const pkg = JSON.parse(packageJsonContent);
    if (pkg.dependencies) result.dependencies = pkg.dependencies;
    if (pkg.devDependencies) result.devDependencies = pkg.devDependencies;
    if (pkg.peerDependencies) result.peerDependencies = pkg.peerDependencies;
    if (pkg.optionalDependencies) result.optionalDependencies = pkg.optionalDependencies;
  } catch {
    // Ignore parse errors
  }

  return result;
}

export function parsePackageLockJson(packageLockContent: string): Record<string, string> {
  const installed: Record<string, string> = {};
  try {
    const lock = JSON.parse(packageLockContent);
    if (lock.packages) {
      for (const [key, val] of Object.entries<any>(lock.packages)) {
        if (!key) continue;
        const pkgName = key.replace(/^node_modules\//, '');
        if (val.version && !pkgName.includes('node_modules/')) {
          installed[pkgName] = val.version;
        }
      }
    } else if (lock.dependencies) {
      for (const [pkgName, val] of Object.entries<any>(lock.dependencies)) {
        if (val && val.version) {
          installed[pkgName] = val.version;
        }
      }
    }
  } catch {
    // Ignore invalid format
  }
  return installed;
}
