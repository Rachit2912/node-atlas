import { NextResponse } from 'next/server';
import { getSecurityImpactAnalysis } from '@/lib/services/security-service';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const repoId = searchParams.get('repoId') || 'repo_nodeatlas-org_ecommerce-microservices-demo';
  const targetId = params.id;
  const impact = await getSecurityImpactAnalysis(repoId, targetId);
  return NextResponse.json(impact);
}
