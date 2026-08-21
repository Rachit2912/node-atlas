import { GitHubService } from './github-service';
import { parseJavaScriptAST } from '../analyzer/parser';
import { resolveModuleDependency } from '../analyzer/resolver';
import { detectCycles, CycleResult } from '../analyzer/cycle-detector';
import { parsePackageJson, parsePackageLockJson } from '../analyzer/package-analyzer';
import {
  saveRepositoryInGraph,
  saveAnalysisRunInGraph,
  saveFileInGraph,
  saveServiceInGraph,
  linkFileToServiceInGraph,
  savePackageInGraph,
  savePackageVersionInGraph,
  saveFileDependencyInGraph,
  saveFilePackageDependencyInGraph,
  saveCycleInGraph,
  inMemoryDb,
} from '../db/queries/graph-queries';

export interface AnalysisPipelineResult {
  runId: string;
  repositoryId: string;
  filesScanned: number;
  dependenciesFound: number;
  cyclesFound: number;
  warnings: string[];
  cycles: CycleResult[];
}

export async function runRepositoryAnalysisPipeline(
  owner: string,
  repo: string,
  branch = 'main',
  githubToken?: string
): Promise<AnalysisPipelineResult> {
  const repoId = `repo_${owner}_${repo}`;
  const runId = `run_${Date.now()}`;
  const ghService = new GitHubService(githubToken);

  inMemoryDb.clearRepositoryData(repoId);

  const repository = {
    id: repoId,
    githubId: repoId,
    owner,
    name: repo,
    fullName: `${owner}/${repo}`,
    defaultBranch: branch,
    url: `https://github.com/${owner}/${repo}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await saveRepositoryInGraph(repository);

  const files = await ghService.getRepositoryTreeFiles(owner, repo, branch);

  const warnings: string[] = [];
  let dependenciesFound = 0;

  const serviceMap = new Map<string, any>();
  files.forEach((f) => {
    if (f.path.startsWith('services/') || f.path.startsWith('apps/')) {
      const parts = f.path.split('/');
      if (parts.length >= 2) {
        const serviceName = parts[1];
        const serviceId = `service_${repoId}_${serviceName}`;
        if (!serviceMap.has(serviceName)) {
          const serviceObj = {
            id: serviceId,
            repositoryId: repoId,
            name: serviceName,
            path: `${parts[0]}/${parts[1]}`,
          };
          serviceMap.set(serviceName, serviceObj);
        }
      }
    }
  });

  for (const serviceObj of Array.from(serviceMap.values())) {
    await saveServiceInGraph(serviceObj);
  }

  const pkgJsonFile = files.find((f) => f.path === 'package.json');
  const pkgLockFile = files.find((f) => f.path === 'package-lock.json');

  if (pkgJsonFile) {
    const pkgInfo = parsePackageJson(pkgJsonFile.content);
    const lockVersions = pkgLockFile ? parsePackageLockJson(pkgLockFile.content) : {};

    const allDeclaredPkgs = {
      ...pkgInfo.dependencies,
      ...pkgInfo.devDependencies,
      ...pkgInfo.peerDependencies,
      ...pkgInfo.optionalDependencies,
    };

    for (const [pkgName] of Object.entries(allDeclaredPkgs)) {
      await savePackageInGraph({ name: pkgName });
      const version = lockVersions[pkgName];
      if (version) {
        await savePackageVersionInGraph(pkgName, version);
      }
    }
  }

  const jsFiles = files.filter((f) => f.path.endsWith('.js') || f.path.endsWith('.mjs') || f.path.endsWith('.cjs'));
  const allJsFilePaths = new Set(jsFiles.map((f) => f.path));

  const adjacencyList = new Map<string, string[]>();

  for (const file of jsFiles) {
    const fileId = `file_${repoId}_${file.path.replace(/[/.]/g, '_')}`;

    await saveFileInGraph({
      id: fileId,
      repositoryId: repoId,
      path: file.path,
      extension: file.extension,
      size: file.size,
      hash: String(file.size),
    });

    if (file.path.startsWith('services/') || file.path.startsWith('apps/')) {
      const parts = file.path.split('/');
      if (parts.length >= 2 && serviceMap.has(parts[1])) {
        const serviceId = serviceMap.get(parts[1]).id;
        await linkFileToServiceInGraph(fileId, serviceId);
      }
    }

    const { dependencies, warnings: parseWarnings } = parseJavaScriptAST(file.content, file.path);
    warnings.push(...parseWarnings);

    const fileAdjacency: string[] = [];

    for (const dep of dependencies) {
      const resolved = resolveModuleDependency(file.path, dep.specifier, allJsFilePaths);

      if (resolved.type === 'local' && resolved.resolvedPath) {
        dependenciesFound++;
        const targetFileId = `file_${repoId}_${resolved.resolvedPath.replace(/[/.]/g, '_')}`;
        await saveFileDependencyInGraph(
          fileId,
          targetFileId,
          dep.type === 'REQUIRES' ? 'REQUIRES' : dep.type === 'DYNAMIC_IMPORTS' ? 'DYNAMIC_IMPORTS' : 'IMPORTS',
          {
            specifier: dep.specifier,
            line: dep.line,
            column: dep.column,
            isDynamic: dep.isDynamic,
          }
        );
        fileAdjacency.push(resolved.resolvedPath);
      } else if (resolved.type === 'package' && resolved.packageName) {
        dependenciesFound++;
        await savePackageInGraph({ name: resolved.packageName });
        await saveFilePackageDependencyInGraph(fileId, resolved.packageName, dep.specifier);
      }
    }

    adjacencyList.set(file.path, fileAdjacency);
  }

  const detectedCycles = detectCycles(adjacencyList);
  for (const cycle of detectedCycles) {
    await saveCycleInGraph({
      id: `cycle_${repoId}_${cycle.id}`,
      repositoryId: repoId,
      length: cycle.length,
      path: cycle.path,
      pathString: cycle.pathString,
    });
  }

  const runData = {
    id: runId,
    repositoryId: repoId,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: 'completed' as const,
    filesScanned: jsFiles.length,
    dependenciesFound,
    cyclesFound: detectedCycles.length,
    warnings,
  };
  await saveAnalysisRunInGraph(runData);

  return {
    runId,
    repositoryId: repoId,
    filesScanned: jsFiles.length,
    dependenciesFound,
    cyclesFound: detectedCycles.length,
    warnings,
    cycles: detectedCycles,
  };
}
