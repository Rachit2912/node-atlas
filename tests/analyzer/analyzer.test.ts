import { describe, it, expect } from 'vitest';
import { parseJavaScriptAST } from '../../lib/analyzer/parser';
import { resolveModuleDependency } from '../../lib/analyzer/resolver';
import { detectCycles } from '../../lib/analyzer/cycle-detector';
import { parsePackageJson, parsePackageLockJson } from '../../lib/analyzer/package-analyzer';

describe('JavaScript Analyzer Tests', () => {
  it('parses ESM imports, requires, re-exports and dynamic imports', () => {
    const code = `
      import foo from './foo.js';
      const bar = require('../bar');
      export { baz } from './baz.js';
      const dynamic = await import('./dynamic.js');
    `;
    const { dependencies, warnings } = parseJavaScriptAST(code, 'src/index.js');
    expect(dependencies).toHaveLength(4);
    const specifiers = dependencies.map((d) => d.specifier);
    expect(specifiers).toContain('./foo.js');
    expect(specifiers).toContain('../bar');
    expect(specifiers).toContain('./baz.js');
    expect(specifiers).toContain('./dynamic.js');
  });

  it('resolves local vs package vs builtin modules correctly', () => {
    const fileSet = new Set(['src/foo.js', 'src/bar/index.js']);

    const resLocal1 = resolveModuleDependency('src/index.js', './foo.js', fileSet);
    expect(resLocal1).toEqual({ type: 'local', resolvedPath: 'src/foo.js' });

    const resLocal2 = resolveModuleDependency('src/index.js', './bar', fileSet);
    expect(resLocal2).toEqual({ type: 'local', resolvedPath: 'src/bar/index.js' });

    const resPkg = resolveModuleDependency('src/index.js', 'express', fileSet);
    expect(resPkg).toEqual({ type: 'package', packageName: 'express' });

    const resBuiltin = resolveModuleDependency('src/index.js', 'fs', fileSet);
    expect(resBuiltin).toEqual({ type: 'builtin', builtinName: 'fs' });
  });

  it('detects self-cycles, 2-node cycles, and 3-node cycles', () => {
    const adj = new Map<string, string[]>();
    adj.set('a.js', ['b.js']);
    adj.set('b.js', ['c.js']);
    adj.set('c.js', ['a.js']);
    adj.set('self.js', ['self.js']);

    const cycles = detectCycles(adj);
    expect(cycles.length).toBeGreaterThanOrEqual(2);
    const selfCycle = cycles.find((c) => c.length === 1);
    expect(selfCycle).toBeDefined();
    expect(selfCycle?.pathString).toContain('self.js');

    const multiCycle = cycles.find((c) => c.length === 3);
    expect(multiCycle).toBeDefined();
    expect(multiCycle?.path).toEqual(['a.js', 'b.js', 'c.js', 'a.js']);
  });

  it('extracts dependencies from package.json and package-lock.json', () => {
    const pkgJson = JSON.stringify({
      dependencies: { express: '^4.18.2' },
      devDependencies: { vitest: '^3.0.0' },
    });
    const parsedPkg = parsePackageJson(pkgJson);
    expect(parsedPkg.dependencies).toEqual({ express: '^4.18.2' });

    const lockJson = JSON.stringify({
      packages: {
        'node_modules/express': { version: '4.18.2' },
      },
    });
    const parsedLock = parsePackageLockJson(lockJson);
    expect(parsedLock['express']).toBe('4.18.2');
  });
});
