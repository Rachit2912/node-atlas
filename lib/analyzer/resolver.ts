import path from 'path';

export interface ResolvedDependency {
  type: 'local' | 'package' | 'builtin' | 'unresolved';
  resolvedPath?: string;
  packageName?: string;
  builtinName?: string;
}

const NODE_BUILTINS = new Set([
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
  'constants', 'crypto', 'dgram', 'diagnostics_channel', 'dns', 'domain',
  'events', 'fs', 'fs/promises', 'http', 'http2', 'https', 'inspector',
  'module', 'net', 'os', 'path', 'perf_hooks', 'process', 'punycode',
  'querystring', 'readline', 'repl', 'stream', 'string_decoder', 'sys',
  'timers', 'tls', 'tty', 'dgram', 'url', 'util', 'v8', 'vm', 'wasi',
  'worker_threads', 'zlib'
]);

export function resolveModuleDependency(
  sourceFilePath: string,
  specifier: string,
  allRepositoryFilePaths: Set<string>
): ResolvedDependency {
  if (!specifier || specifier === '<dynamic_expression>' || specifier === '<dynamic_require>') {
    return { type: 'unresolved' };
  }

  if (specifier.startsWith('node:')) {
    return { type: 'builtin', builtinName: specifier };
  }
  if (NODE_BUILTINS.has(specifier)) {
    return { type: 'builtin', builtinName: specifier };
  }

  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    const sourceDir = path.posix.dirname(sourceFilePath);
    const targetNormalized = path.posix.normalize(
      specifier.startsWith('/') ? specifier.slice(1) : path.posix.join(sourceDir, specifier)
    );

    const candidates = [
      targetNormalized,
      `${targetNormalized}.js`,
      `${targetNormalized}.mjs`,
      `${targetNormalized}.cjs`,
      `${targetNormalized}/index.js`,
      `${targetNormalized}/index.mjs`,
      `${targetNormalized}/index.cjs`
    ];

    for (const candidate of candidates) {
      if (allRepositoryFilePaths.has(candidate)) {
        return { type: 'local', resolvedPath: candidate };
      }
    }

    return { type: 'unresolved' };
  }

  let packageName = specifier;
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    packageName = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  } else {
    packageName = specifier.split('/')[0];
  }

  return { type: 'package', packageName };
}
