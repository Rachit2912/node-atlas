import { NextResponse } from 'next/server';
import { getGraphDataForRepo, saveRepositoryInGraph, inMemoryDb } from '@/lib/db/queries/graph-queries';
import { runRepositoryAnalysisPipeline } from '@/lib/github/analysis-pipeline';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const repoId = params.id;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token') || undefined;

  const graphData = await getGraphDataForRepo(repoId);
  return NextResponse.json(graphData);
}
