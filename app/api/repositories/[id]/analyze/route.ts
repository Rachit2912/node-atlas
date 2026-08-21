import { NextResponse } from 'next/server';
import { runRepositoryAnalysisPipeline } from '@/lib/github/analysis-pipeline';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    let repoId = params.id;
    let owner = body.owner || 'nodeatlas-org';
    let repo = body.repo || 'ecommerce-microservices-demo';
    let branch = body.branch || 'main';

    if (repoId.startsWith('repo_')) {
      const parts = repoId.replace(/^repo_/, '').split('_');
      if (parts.length >= 2) {
        owner = parts[0];
        repo = parts.slice(1).join('_');
      }
    }

    const result = await runRepositoryAnalysisPipeline(owner, repo, branch, body.githubToken);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
