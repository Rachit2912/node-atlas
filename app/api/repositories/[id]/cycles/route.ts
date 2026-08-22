import { NextResponse } from 'next/server';
import { inMemoryDb } from '@/lib/db/queries/graph-queries';
import { runRepositoryAnalysisPipeline } from '@/lib/github/analysis-pipeline';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const repoId = params.id;
  const cycles = Array.from(inMemoryDb.cycles.values()).filter(
    (c) => c.repositoryId === repoId
  );

  return NextResponse.json(cycles);
}
