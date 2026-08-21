import { NextResponse } from 'next/server';
import { inMemoryDb } from '@/lib/db/queries/graph-queries';
import { runRepositoryAnalysisPipeline } from '@/lib/github/analysis-pipeline';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const repoId = params.id;
  let cycles = Array.from(inMemoryDb.cycles.values()).filter(
    (c) => c.repositoryId === repoId
  );

  if (cycles.length === 0 && inMemoryDb.files.size === 0) {
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
    cycles = Array.from(inMemoryDb.cycles.values()).filter(
      (c) => c.repositoryId === repoId
    );
  }

  return NextResponse.json(cycles);
}
