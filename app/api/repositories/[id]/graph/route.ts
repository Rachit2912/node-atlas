import { NextResponse } from 'next/server';
import { getGraphDataForRepo, saveRepositoryInGraph, inMemoryDb } from '@/lib/db/queries/graph-queries';
import { runRepositoryAnalysisPipeline } from '@/lib/github/analysis-pipeline';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const repoId = params.id;

  // Auto-analyze if graph data is empty for this repo
  let graphData = await getGraphDataForRepo(repoId);
  if (!graphData.nodes || graphData.nodes.length === 0) {
    let owner = 'nodeatlas-org';
    let repo = 'ecommerce-microservices-demo';
    if (repoId.startsWith('repo_')) {
      const parts = repoId.replace(/^repo_/, '').split('_');
      if (parts.length >= 2) {
        owner = parts[0];
        repo = parts.slice(1).join('_');
      }
    }
    await runRepositoryAnalysisPipeline(owner, repo, 'main');
    graphData = await getGraphDataForRepo(repoId);
  }

  return NextResponse.json(graphData);
}
