export interface ScannedFile {
  path: string;
  extension: string;
  content: string;
  size: number;
}

export const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  'out',
  'vendor',
  '.vercel'
]);

export function isJavaScriptFile(filename: string): boolean {
  return filename.endsWith('.js') || filename.endsWith('.mjs') || filename.endsWith('.cjs');
}

export function shouldIgnoreDirectory(dirName: string): boolean {
  return IGNORED_DIRECTORIES.has(dirName);
}
