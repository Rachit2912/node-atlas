'use client';

import React, { useEffect, useState } from 'react';
import { NavigationHeader } from '@/components/navigation-header';
import { useRepo } from '@/lib/hooks/use-repo';
import Link from 'next/link';
import {
  FileCode,
  Network,
  RefreshCw,
  ShieldAlert,
  Package,
  Server,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export default function DashboardPage() {
  const { repoMeta, repoId, selectRepo } = useRepo();
  const [stats, setStats] = useState<any>(null);
  const [cycles, setCycles] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const getSavedToken = () => {
    return typeof window !== 'undefined' ? localStorage.getItem('nodeatlas_github_token') || undefined : undefined;
  };

  const loadData = async () => {
    try {
      const token = getSavedToken();
      const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
      const statsRes = await fetch(`/api/repositories/${repoId}/stats${tokenQuery}`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }

      const cyclesRes = await fetch(`/api/repositories/${repoId}/cycles${tokenQuery}`);
      if (cyclesRes.ok) {
        const cyclesData = await cyclesRes.json();
        setCycles(cyclesData);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadData();
  }, [repoId]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const token = getSavedToken();
      await fetch(`/api/repositories/${repoId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...repoMeta, githubToken: token })
      });
      const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
      const statsRes = await fetch(`/api/repositories/${repoId}/stats${tokenQuery}`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }
      const cyclesRes = await fetch(`/api/repositories/${repoId}/cycles${tokenQuery}`);
      if (cyclesRes.ok) {
        const cyclesData = await cyclesRes.json();
        setCycles(cyclesData);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <NavigationHeader
        repoName={`${repoMeta.owner}/${repoMeta.repo}`}
        branch={repoMeta.branch}
        lastAnalyzed={stats?.lastAnalyzedAt}
        isAnalyzing={isAnalyzing}
        onAnalyze={handleAnalyze}
        onSelectRepo={(repo) => {
          selectRepo({
            owner: repo.owner,
            name: repo.name || repo.repo,
            defaultBranch: repo.defaultBranch || repo.branch || 'main'
          });
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 rounded-xl bg-gradient-to-r from-blue-50 via-white to-slate-50 dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
              NodeAtlas Dependency Intelligence Engine
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Persistent CognoDB graph representation of Node.js dependencies, circular references, and package exposure paths across your repository.
            </p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow transition disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing Repository...' : 'Re-run Graph Analysis'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>JavaScript Files</span>
              <FileCode className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2 font-mono">
              {stats?.filesCount ?? 0}
            </p>
            <span className="text-[11px] text-slate-500 dark:text-slate-500 mt-1 block">.js, .mjs, .cjs source modules</span>
          </div>

          <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Dependency Edges</span>
              <Network className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2 font-mono">
              {stats?.dependenciesCount ?? 0}
            </p>
            <span className="text-[11px] text-slate-500 dark:text-slate-500 mt-1 block">Imports, requires & re-exports</span>
          </div>

          <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Discovered Services</span>
              <Server className="w-4 h-4 text-purple-500 dark:text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2 font-mono">
              {stats?.servicesCount ?? 0}
            </p>
            <span className="text-[11px] text-slate-500 dark:text-slate-500 mt-1 block">Microservice boundaries</span>
          </div>

          <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>External Packages</span>
              <Package className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2 font-mono">
              {stats?.packagesCount ?? 0}
            </p>
            <span className="text-[11px] text-slate-500 dark:text-slate-500 mt-1 block">npm dependencies</span>
          </div>

          <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Dependency Cycles</span>
              <RefreshCw className="w-4 h-4 text-red-500 dark:text-red-400" />
            </div>
            <p className={`text-2xl font-bold mt-2 font-mono ${(stats?.cyclesCount ?? 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {stats?.cyclesCount ?? 0}
            </p>
            <span className="text-[11px] text-slate-500 dark:text-slate-500 mt-1 block">SCC circular loops</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-red-500 dark:text-red-400" />
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Circular Dependency Cycles</h2>
              </div>
              <Link
                href="/cycles"
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 flex items-center space-x-1"
              >
                <span>View Cycles Mode</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {cycles.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-500 dark:text-slate-500 bg-slate-50/80 dark:bg-slate-950/50 rounded-lg border border-slate-200 dark:border-slate-800/80">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">No circular dependencies detected</p>
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-80">
                {cycles.map((cycle) => (
                  <div
                    key={cycle.id}
                    className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs font-mono space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="text-red-600 dark:text-red-400 font-bold">{cycle.id}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300">
                        {cycle.length} Nodes Loop
                      </span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-300 break-all">{cycle.pathString}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <ShieldAlert className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Security Exposure Target Checker</h2>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                Enter any npm package or service name to trace full dependency exposure paths and multi-hop Cypher traversals across your system.
              </p>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 space-y-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400 block font-medium">Quick Test Targets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['lodash', 'express', 'axios', 'auth'].map((t) => (
                    <span key={t} className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <Link
              href="/security"
              className="mt-6 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 text-xs font-medium border border-slate-200 dark:border-slate-700 transition"
            >
              <span>Open Security Impact Analyzer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
