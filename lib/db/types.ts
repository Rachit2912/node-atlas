export interface GraphNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

export interface GraphRelationship {
  id: string;
  type: string;
  startNodeId: string;
  endNodeId: string;
  properties: Record<string, any>;
}

export interface RepositoryNode {
  id: string;
  githubId?: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileNode {
  id: string;
  repositoryId: string;
  path: string;
  extension: string;
  size: number;
  hash: string;
}

export interface ServiceNode {
  id: string;
  repositoryId: string;
  name: string;
  path: string;
}

export interface PackageNode {
  id: string;
  name: string;
}

export interface PackageVersionNode {
  id: string;
  name: string;
  version: string;
}

export interface CycleNode {
  id: string;
  repositoryId: string;
  length: number;
  path: string[];
  pathString: string;
}

export interface AnalysisRunNode {
  id: string;
  repositoryId: string;
  startedAt: string;
  completedAt?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  filesScanned: number;
  dependenciesFound: number;
  cyclesFound: number;
  warnings: string[];
}

export interface GraphData {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    properties: Record<string, any>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type: string;
    properties?: Record<string, any>;
  }>;
}
