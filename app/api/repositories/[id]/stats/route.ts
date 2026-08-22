import { NextResponse } from 'next/server';
import { inMemoryDb } from '@/lib/db/queries/graph-queries';
import { runRepositoryAnalysisPipeline } from '@/lib/github/analysis-pipeline';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const repoId = params.id;
  const repoFiles = Array.from(inMemoryDb.files.values()).filter((f) => f.repositoryId === repoId);
  const repoServices = Array.from(inMemoryDb.services.values()).filter((s) => s.repositoryId === repoId);
  const repoCycles = Array.from(inMemoryDb.cycles.values()).filter((c) => c.repositoryId === repoId);

  const fileIds = new Set(repoFiles.map((f) => f.id));
  const edges = inMemoryDb.edges.filter((e) => fileIds.has(e.source) || fileIds.has(e.target));
  const packages = Array.from(inMemoryDb.packages.values());

  const lastRun = Array.from(inMemoryDb.analysisRuns.values())
    .filter((r) => r.repositoryId === repoId)
    .pop();

  return NextResponse.json({
    repositoryId: repoId,
    stats: {
      filesCount: repoFiles.length,
      servicesCount: repoServices.length,
      dependenciesCount: edges.length,
      packagesCount: packages.length,
      cyclesCount: repoCycles.length,
      lastAnalyzedAt: lastRun?.completedAt || new Date().toISOString(),
      warningsCount: lastRun?.warnings?.length || 0
    }
  });
}
