import { NextResponse } from 'next/server';
import { GitHubService } from '@/lib/github/github-service';
import { inMemoryDb } from '@/lib/db/queries/graph-queries';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token') || undefined;
  const gh = new GitHubService(token);
  const repos = await gh.getUserRepositories();
  const dbRepos = Array.from(inMemoryDb.repositories.values());

  const combined = [...repos];
  dbRepos.forEach((dRepo) => {
    if (!combined.some((c) => c.id === dRepo.id)) {
      combined.push(dRepo);
    }
  });

  return NextResponse.json(combined);
}
