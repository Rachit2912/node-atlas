import { NextResponse } from 'next/server';
import { getSecurityImpactAnalysis } from '@/lib/services/security-service';
import { runRepositoryAnalysisPipeline } from '@/lib/github/analysis-pipeline';
import { inMemoryDb } from '@/lib/db/queries/graph-queries';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { target, targetType } = body;
    const repoId = params.id;

    if (!target) {
      return NextResponse.json({ error: 'Target query string required' }, { status: 400 });
    }

    // Ensure repository analysis has run
    const repoFiles = Array.from(inMemoryDb.files.values()).filter((f) => f.repositoryId === repoId);
    if (repoFiles.length === 0) {
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
    }

    const impact = await getSecurityImpactAnalysis(repoId, target, targetType);
    return NextResponse.json(impact);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
