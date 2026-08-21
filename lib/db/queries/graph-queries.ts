import { executeCypherQuery } from '../cognodb';
import { GraphData } from '../types';

export class InMemoryGraphStore {
  private static instance: InMemoryGraphStore;

  public repositories: Map<string, any> = new Map();
  public services: Map<string, any> = new Map();
  public files: Map<string, any> = new Map();
  public packages: Map<string, any> = new Map();
  public packageVersions: Map<string, any> = new Map();
  public cycles: Map<string, any> = new Map();
  public analysisRuns: Map<string, any> = new Map();
  public securityTargets: Map<string, any> = new Map();

  public edges: Array<{
    id: string;
    source: string;
    target: string;
    type: string;
    properties?: Record<string, any>;
  }> = [];

  public static getInstance(): InMemoryGraphStore {
    if (!InMemoryGraphStore.instance) {
      InMemoryGraphStore.instance = new InMemoryGraphStore();
    }
    return InMemoryGraphStore.instance;
  }

  public clearRepositoryData(repoId: string) {
    for (const [id, file] of Array.from(this.files.entries())) {
      if (file.repositoryId === repoId) this.files.delete(id);
    }
    for (const [id, service] of Array.from(this.services.entries())) {
      if (service.repositoryId === repoId) this.services.delete(id);
    }
    for (const [id, cycle] of Array.from(this.cycles.entries())) {
      if (cycle.repositoryId === repoId) this.cycles.delete(id);
    }
    for (const [id, st] of Array.from(this.securityTargets.entries())) {
      if (st.repositoryId === repoId) this.securityTargets.delete(id);
    }
    this.edges = this.edges.filter((e) => {
      const srcFile = this.files.get(e.source);
      return !srcFile || srcFile.repositoryId !== repoId;
    });
  }
}

export const inMemoryDb = InMemoryGraphStore.getInstance();

export async function saveRepositoryInGraph(repo: any) {
  inMemoryDb.repositories.set(repo.id, repo);
  const cypher = `
    MERGE (r:Repository {id: $id})
    SET r.githubId = $githubId,
        r.owner = $owner,
        r.name = $name,
        r.fullName = $fullName,
        r.defaultBranch = $defaultBranch,
        r.url = $url,
        r.updatedAt = $updatedAt
    RETURN r
  `;
  await executeCypherQuery(cypher, repo);
}

export async function saveAnalysisRunInGraph(run: any) {
  inMemoryDb.analysisRuns.set(run.id, run);
  const cypher = `
    MERGE (a:AnalysisRun {id: $id})
    SET a.repositoryId = $repositoryId,
        a.startedAt = $startedAt,
        a.completedAt = $completedAt,
        a.status = $status,
        a.filesScanned = $filesScanned,
        a.dependenciesFound = $dependenciesFound,
        a.cyclesFound = $cyclesFound,
        a.warnings = $warnings
    WITH a
    MATCH (r:Repository {id: $repositoryId})
    MERGE (r)-[:HAS_ANALYSIS]->(a)
    RETURN a
  `;
  await executeCypherQuery(cypher, run);
}

export async function saveFileInGraph(file: any) {
  inMemoryDb.files.set(file.id, file);
  const cypher = `
    MERGE (f:File {id: $id})
    SET f.repositoryId = $repositoryId,
        f.path = $path,
        f.extension = $extension,
        f.size = $size,
        f.hash = $hash
    WITH f
    MATCH (r:Repository {id: $repositoryId})
    MERGE (r)-[:CONTAINS]->(f)
    RETURN f
  `;
  await executeCypherQuery(cypher, file);
}

export async function saveServiceInGraph(service: any) {
  inMemoryDb.services.set(service.id, service);
  const cypher = `
    MERGE (s:Service {id: $id})
    SET s.repositoryId = $repositoryId,
        s.name = $name,
        s.path = $path
    WITH s
    MATCH (r:Repository {id: $repositoryId})
    MERGE (r)-[:CONTAINS_SERVICE]->(s)
    RETURN s
  `;
  await executeCypherQuery(cypher, service);
}

export async function linkFileToServiceInGraph(fileId: string, serviceId: string) {
  inMemoryDb.edges.push({
    id: `svc_${serviceId}_file_${fileId}`,
    source: serviceId,
    target: fileId,
    type: 'CONTAINS'
  });
  const cypher = `
    MATCH (s:Service {id: $serviceId})
    MATCH (f:File {id: $fileId})
    MERGE (s)-[:CONTAINS]->(f)
  `;
  await executeCypherQuery(cypher, { serviceId, fileId });
}

export async function savePackageInGraph(pkg: any) {
  inMemoryDb.packages.set(pkg.name, pkg);
  const cypher = `
    MERGE (p:Package {id: $name})
    SET p.name = $name
    RETURN p
  `;
  await executeCypherQuery(cypher, pkg);
}

export async function savePackageVersionInGraph(pkgName: string, version: string) {
  const id = `${pkgName}@${version}`;
  const pkgVer = { id, name: pkgName, version };
  inMemoryDb.packageVersions.set(id, pkgVer);
  const cypher = `
    MATCH (p:Package {id: $pkgName})
    MERGE (pv:PackageVersion {id: $id})
    SET pv.name = $pkgName, pv.version = $version
    MERGE (p)-[:HAS_VERSION]->(pv)
  `;
  await executeCypherQuery(cypher, { id, pkgName, version });
}

export async function saveFileDependencyInGraph(
  sourceFileId: string,
  targetFileId: string,
  type: 'IMPORTS' | 'REQUIRES' | 'DYNAMIC_IMPORTS',
  metadata: { specifier: string; line: number; column: number; isDynamic: boolean }
) {
  inMemoryDb.edges.push({
    id: `dep_${sourceFileId}_${targetFileId}_${metadata.line}_${metadata.column}`,
    source: sourceFileId,
    target: targetFileId,
    type,
    properties: metadata
  });

  const cypher = `
    MATCH (s:File {id: $sourceFileId})
    MATCH (t:File {id: $targetFileId})
    MERGE (s)-[r:${type} {specifier: $specifier, line: $line}]->(t)
    SET r.column = $column, r.isDynamic = $isDynamic
  `;
  await executeCypherQuery(cypher, {
    sourceFileId,
    targetFileId,
    specifier: metadata.specifier,
    line: metadata.line,
    column: metadata.column,
    isDynamic: metadata.isDynamic
  });
}

export async function saveFilePackageDependencyInGraph(
  sourceFileId: string,
  packageName: string,
  specifier: string
) {
  inMemoryDb.edges.push({
    id: `pkgdep_${sourceFileId}_${packageName}`,
    source: sourceFileId,
    target: packageName,
    type: 'DEPENDS_ON',
    properties: { specifier }
  });

  const cypher = `
    MATCH (f:File {id: $sourceFileId})
    MERGE (p:Package {id: $packageName})
    MERGE (f)-[r:DEPENDS_ON {specifier: $specifier}]->(p)
  `;
  await executeCypherQuery(cypher, { sourceFileId, packageName, specifier });
}

export async function saveCycleInGraph(cycle: any) {
  inMemoryDb.cycles.set(cycle.id, cycle);
  const cypher = `
    MERGE (c:Cycle {id: $id})
    SET c.repositoryId = $repositoryId,
        c.length = $length,
        c.path = $path,
        c.pathString = $pathString
    WITH c
    UNWIND $path AS filePath
    MATCH (f:File {repositoryId: $repositoryId, path: filePath})
    MERGE (c)-[:CONTAINS]->(f)
  `;
  await executeCypherQuery(cypher, cycle);
}

export async function getGraphDataForRepo(repoId: string): Promise<GraphData> {
  const cypher = `
    MATCH (r:Repository {id: $repoId})-[:CONTAINS]->(f:File)
    OPTIONAL MATCH (f)-[r_dep:IMPORTS|REQUIRES|DYNAMIC_IMPORTS]->(f2:File)
    OPTIONAL MATCH (f)-[r_pkg:DEPENDS_ON]->(p:Package)
    OPTIONAL MATCH (s:Service {repositoryId: $repoId})-[:CONTAINS]->(f)
    RETURN f, r_dep, f2, r_pkg, p, s
  `;
  const records = await executeCypherQuery(cypher, { repoId });

  if (records && records.length > 0) {
    const nodesMap = new Map<string, any>();
    const edgesList: any[] = [];

    records.forEach((rec) => {
      if (rec.f) {
        nodesMap.set(rec.f.id, {
          id: rec.f.id,
          label: rec.f.path,
          type: 'File',
          properties: rec.f
        });
      }
      if (rec.f2) {
        nodesMap.set(rec.f2.id, {
          id: rec.f2.id,
          label: rec.f2.path,
          type: 'File',
          properties: rec.f2
        });
        if (rec.r_dep) {
          edgesList.push({
            id: `${rec.f.id}->${rec.f2.id}`,
            source: rec.f.id,
            target: rec.f2.id,
            type: 'IMPORTS',
            properties: rec.r_dep
          });
        }
      }
      if (rec.p) {
        nodesMap.set(rec.p.id, {
          id: rec.p.id,
          label: rec.p.name || rec.p.id,
          type: 'Package',
          properties: rec.p
        });
        if (rec.f) {
          edgesList.push({
            id: `${rec.f.id}->${rec.p.id}`,
            source: rec.f.id,
            target: rec.p.id,
            type: 'DEPENDS_ON'
          });
        }
      }
      if (rec.s) {
        nodesMap.set(rec.s.id, {
          id: rec.s.id,
          label: rec.s.name,
          type: 'Service',
          properties: rec.s
        });
        if (rec.f) {
          edgesList.push({
            id: `${rec.s.id}->${rec.f.id}`,
            source: rec.s.id,
            target: rec.f.id,
            type: 'CONTAINS'
          });
        }
      }
    });

    return {
      nodes: Array.from(nodesMap.values()),
      edges: edgesList
    };
  }

  const repoFiles = Array.from(inMemoryDb.files.values()).filter((f) => f.repositoryId === repoId);
  const repoServices = Array.from(inMemoryDb.services.values()).filter((s) => s.repositoryId === repoId);
  const repoFileIds = new Set(repoFiles.map((f) => f.id));

  const nodes: GraphData['nodes'] = [];
  const edges: GraphData['edges'] = [];

  repoFiles.forEach((file) => {
    nodes.push({
      id: file.id,
      label: file.path,
      type: 'File',
      properties: file
    });
  });

  repoServices.forEach((service) => {
    nodes.push({
      id: service.id,
      label: service.name,
      type: 'Service',
      properties: service
    });
  });

  const packageIds = new Set<string>();

  inMemoryDb.edges.forEach((edge) => {
    const isSourceFile = repoFileIds.has(edge.source);
    const isTargetFile = repoFileIds.has(edge.target);
    const isSourceService = repoServices.some((s) => s.id === edge.source);

    if (isSourceFile || isTargetFile || isSourceService) {
      edges.push(edge);
      if (edge.type === 'DEPENDS_ON') {
        packageIds.add(edge.target);
      }
    }
  });

  packageIds.forEach((pkgName) => {
    nodes.push({
      id: pkgName,
      label: pkgName,
      type: 'Package',
      properties: { name: pkgName }
    });
  });

  return { nodes, edges };
}
