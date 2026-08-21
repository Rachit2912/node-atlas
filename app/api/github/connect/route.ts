import { NextResponse } from 'next/server';
import { GitHubService } from '@/lib/github/github-service';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = body.token || process.env.GITHUB_TOKEN;
    const gh = new GitHubService(token);
    const repos = await gh.getUserRepositories();
    return NextResponse.json({ success: true, count: repos.length, repositories: repos });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
