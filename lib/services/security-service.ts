import { inMemoryDb } from '../db/queries/graph-queries';

export async function getSecurityImpactAnalysis(
  repoId: string,
  targetQuery: string,
  targetType?: 'Auto' | 'Package' | 'Service' | 'File'
) {
  const query = targetQuery.trim();
  const repoFiles = Array.from(inMemoryDb.files.values()).filter((f) => f.repositoryId === repoId);
  const repoServices = Array.from(inMemoryDb.services.values()).filter((s) => s.repositoryId === repoId);
  const repoFileIds = new Set(repoFiles.map((f) => f.id));

  let matchedPackage: string | null = null;
  let matchedService: any = null;
  let matchedFile: any = null;

  const cleanPackageName = query.split('@')[0];
  if (!targetType || targetType === 'Auto' || targetType === 'Package') {
    const pkg = inMemoryDb.packages.get(cleanPackageName);
    if (pkg) matchedPackage = cleanPackageName;
  }

  if (!matchedPackage && (!targetType || targetType === 'Auto' || targetType === 'Service')) {
    matchedService = repoServices.find(
      (s) => s.name.toLowerCase() === query.toLowerCase() || s.path.toLowerCase().includes(query.toLowerCase())
    );
  }

  if (!matchedPackage && !matchedService && (!targetType || targetType === 'Auto' || targetType === 'File')) {
    matchedFile = repoFiles.find(
      (f) => f.path.toLowerCase() === query.toLowerCase() || f.path.toLowerCase().endsWith(query.toLowerCase())
    );
  }

  const affectedFilesSet = new Set<string>();
  const affectedServicesSet = new Set<string>();
  const impactEdges: any[] = [];
  const impactNodesMap = new Map<string, any>();

  if (matchedPackage) {
    impactNodesMap.set(matchedPackage, {
      id: matchedPackage,
      label: matchedPackage,
      type: 'Package',
      properties: { name: matchedPackage, status: 'Security Exposure Target' }
    });

    const directFileIds = new Set<string>();
    inMemoryDb.edges.forEach((e) => {
      if (e.target === matchedPackage && e.type === 'DEPENDS_ON' && repoFileIds.has(e.source)) {
        directFileIds.add(e.source);
        impactEdges.push(e);
      }
    });

    const queue = Array.from(directFileIds);
    queue.forEach((fId) => {
      affectedFilesSet.add(fId);
      const fileNode = inMemoryDb.files.get(fId);
      if (fileNode) {
        impactNodesMap.set(fId, {
          id: fId,
          label: fileNode.path,
          type: 'File',
          properties: fileNode
        });
      }
    });

    while (queue.length > 0) {
      const currFileId = queue.shift()!;
      inMemoryDb.edges.forEach((e) => {
        if (e.target === currFileId && repoFileIds.has(e.source) && !affectedFilesSet.has(e.source)) {
          affectedFilesSet.add(e.source);
          queue.push(e.source);
          impactEdges.push(e);
          const fNode = inMemoryDb.files.get(e.source);
          if (fNode) {
            impactNodesMap.set(e.source, {
              id: e.source,
              label: fNode.path,
              type: 'File',
              properties: fNode
            });
          }
        }
      });
    }

    repoServices.forEach((service) => {
      inMemoryDb.edges.forEach((e) => {
        if (e.source === service.id && affectedFilesSet.has(e.target)) {
          affectedServicesSet.add(service.name);
          impactNodesMap.set(service.id, {
            id: service.id,
            label: service.name,
            type: 'Service',
            properties: service
          });
          impactEdges.push(e);
        }
      });
    });
  } else if (matchedService) {
    impactNodesMap.set(matchedService.id, {
      id: matchedService.id,
      label: matchedService.name,
      type: 'Service',
      properties: matchedService
    });
    affectedServicesSet.add(matchedService.name);

    inMemoryDb.edges.forEach((e) => {
      if (e.source === matchedService.id) {
        affectedFilesSet.add(e.target);
        impactEdges.push(e);
        const fNode = inMemoryDb.files.get(e.target);
        if (fNode) {
          impactNodesMap.set(e.target, {
            id: e.target,
            label: fNode.path,
            type: 'File',
            properties: fNode
          });
        }
      }
    });
  } else if (matchedFile) {
    impactNodesMap.set(matchedFile.id, {
      id: matchedFile.id,
      label: matchedFile.path,
      type: 'File',
      properties: matchedFile
    });
    affectedFilesSet.add(matchedFile.id);
  }

  return {
    target: query,
    targetType: matchedPackage ? 'Package' : matchedService ? 'Service' : matchedFile ? 'File' : 'Unknown',
    found: Boolean(matchedPackage || matchedService || matchedFile),
    metrics: {
      potentiallyAffectedFilesCount: affectedFilesSet.size,
      potentiallyAffectedServicesCount: affectedServicesSet.size,
      affectedServices: Array.from(affectedServicesSet),
      dependencyPathsCount: impactEdges.length
    },
    graphData: {
      nodes: Array.from(impactNodesMap.values()),
      edges: impactEdges
    },
    disclaimer: 'Findings reflect dependency relationship exposure based on graph traversals, not active code exploitability.'
  };
}
