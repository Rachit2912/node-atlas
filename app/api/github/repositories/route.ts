import { NextResponse } from 'next/server';
import { GitHubService } from '@/lib/github/github-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token') || undefined;
  const gh = new GitHubService(token);
  const repos = await gh.getUserRepositories();
  return NextResponse.json(repos);
}
