'use client';

import React, { useState } from 'react';
import { NavigationHeader } from '@/components/navigation-header';
import { GraphViewer } from '@/components/graph/graph-viewer';
import { useRepo } from '@/lib/hooks/use-repo';
import { ShieldAlert, Search, ArrowRight } from 'lucide-react';

export default function SecurityPage() {
  const { repoMeta, repoId, selectRepo } = useRepo();
  const [target, setTarget] = useState('lodash');
  const [targetType, setTargetType] = useState<'Auto' | 'Package' | 'Service' | 'File'>('Auto');
  const [impactResult, setImpactResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyzeImpact = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!target) return;
    setIsLoading(true);

    try {
      const res = await fetch(`/api/repositories/${repoId}/security-targets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, targetType })
      });

      if (res.ok) {
        const data = await res.json();
        setImpactResult(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReanalyzeRepo = async () => {
    setIsAnalyzing(true);
    try {
      await fetch(`/api/repositories/${repoId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repoMeta)
      });
      if (target) await handleAnalyzeImpact();
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-200">
      <NavigationHeader
        repoName={`${repoMeta.owner}/${repoMeta.repo}`}
        branch={repoMeta.branch}
        isAnalyzing={isAnalyzing}
        onAnalyze={handleReanalyzeRepo}
        onSelectRepo={(repo) => {
          selectRepo({
            owner: repo.owner,
            name: repo.name || repo.repo,
            defaultBranch: repo.defaultBranch || repo.branch || 'main'
          });
        }}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-96 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 flex flex-col space-y-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Security Impact Analyzer</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Analyze dependency exposure for npm packages, services, or file paths across your repository.
            </p>
          </div>

          <form onSubmit={handleAnalyzeImpact} className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Security Impact Target
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. lodash, express, auth"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Target Type
              </label>
              <div className="grid grid-cols-4 gap-1">
                {(['Auto', 'Package', 'Service', 'File'] as const).map((type) => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => setTargetType(type)}
                    className={`px-2 py-1 rounded text-[11px] font-medium border text-center transition ${
                      targetType === type
                        ? 'bg-amber-100 dark:bg-amber-500/20 border-amber-500 text-amber-800 dark:text-amber-400 font-bold'
                        : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !target}
              className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              {isLoading ? (
                <span>Tracing Impact Graph...</span>
              ) : (
                <>
                  <span>Analyze Impact</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
            <span className="text-[11px] text-slate-500 dark:text-slate-500 block font-medium">Quick Demo Targets:</span>
            <div className="flex flex-wrap gap-1.5">
              {['lodash', 'express', 'axios', 'auth'].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTarget(t);
                    setTargetType('Auto');
                  }}
                  className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono hover:bg-slate-300 dark:hover:bg-slate-700 text-[11px]"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {impactResult && (
            <div className="p-3.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Impact Summary</span>
                <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800/80 font-mono text-[10px]">
                  {impactResult.targetType}
                </span>
              </div>

              <div className="space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Potentially Affected Files:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    {impactResult.metrics.potentiallyAffectedFilesCount}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Affected Services Boundaries:</span>
                  <span className="text-purple-600 dark:text-purple-400 font-bold">
                    {impactResult.metrics.potentiallyAffectedServicesCount}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Multi-hop Dependency Paths:</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    {impactResult.metrics.dependencyPathsCount}
                  </span>
                </div>
              </div>

              {impactResult.metrics.affectedServices.length > 0 && (
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Affected Services:</span>
                  <div className="flex flex-wrap gap-1">
                    {impactResult.metrics.affectedServices.map((s: string) => (
                      <span key={s} className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/50 border border-purple-300 dark:border-purple-800/60 text-purple-800 dark:text-purple-300 text-[10px] font-mono">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-slate-500 italic border-t border-slate-200 dark:border-slate-800 pt-2 leading-tight">
                {impactResult.disclaimer}
              </p>
            </div>
          )}
        </div>

        <div className="flex-1 p-4 bg-slate-100 dark:bg-slate-950">
          {impactResult ? (
            <GraphViewer graphData={impactResult.graphData} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950">
              <ShieldAlert className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Enter a target package or service to analyze impact</p>
              <p className="text-xs text-slate-500 dark:text-slate-600 mt-1">Traces dependency exposure paths through CognoDB multi-hop graph queries.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
