'use client';

import { useState, useEffect } from 'react';

export interface RepoMeta {
  owner: string;
  repo: string;
  branch: string;
}

const DEFAULT_REPO: RepoMeta = {
  owner: 'nodeatlas-org',
  repo: 'ecommerce-microservices-demo',
  branch: 'main'
};

const STORAGE_KEY = 'nodeatlas_selected_repo';

export function useRepo() {
  const [repoMeta, setRepoMeta] = useState<RepoMeta>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.owner && parsed.repo) return parsed;
        }
      } catch {
        // Fallback
      }
    }
    return DEFAULT_REPO;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.owner && parsed.repo) {
            setRepoMeta(parsed);
          }
        }
      } catch {
        // Fallback
      }
    }
  }, []);

  const selectRepo = (newRepo: { owner?: string; repo?: string; name?: string; defaultBranch?: string; branch?: string }) => {
    const updated: RepoMeta = {
      owner: newRepo.owner || repoMeta.owner,
      repo: newRepo.repo || newRepo.name || repoMeta.repo,
      branch: newRepo.branch || newRepo.defaultBranch || 'main'
    };
    setRepoMeta(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };

  const repoId = `repo_${repoMeta.owner}_${repoMeta.repo}`;

  return { repoMeta, repoId, selectRepo };
}
