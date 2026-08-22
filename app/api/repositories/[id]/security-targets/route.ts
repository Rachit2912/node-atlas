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


    const impact = await getSecurityImpactAnalysis(repoId, target, targetType);
    return NextResponse.json(impact);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
