import { NextResponse } from 'next/server';
import { inMemoryDb } from '@/lib/db/queries/graph-queries';
import { runRepositoryAnalysisPipeline } from '@/lib/github/analysis-pipeline';

const DEMO_REPO_ID = 'repo_nodeatlas-org_ecommerce-microservices-demo';

export async function GET() {
  const isSeeded = inMemoryDb.repositories.has(DEMO_REPO_ID);
  return NextResponse.json({ seeded: isSeeded, repoId: DEMO_REPO_ID });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const shouldSeed = Boolean(body.seed);

    if (shouldSeed) {
      const result = await runRepositoryAnalysisPipeline(
        'nodeatlas-org',
        'ecommerce-microservices-demo',
        'main'
      );
      return NextResponse.json({
        success: true,
        seeded: true,
        repoId: DEMO_REPO_ID,
        result
      });
    } else {
      inMemoryDb.clearRepositoryData(DEMO_REPO_ID);
      inMemoryDb.repositories.delete(DEMO_REPO_ID);
      return NextResponse.json({
        success: true,
        seeded: false,
        repoId: DEMO_REPO_ID
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to toggle demo seed' },
      { status: 500 }
    );
  }
}
