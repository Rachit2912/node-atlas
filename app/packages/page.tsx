'use client';

import React, { useEffect, useState } from 'react';
import { NavigationHeader } from '@/components/navigation-header';
import { useRepo } from '@/lib/hooks/use-repo';
import { Package, ExternalLink, ShieldAlert, FileCode } from 'lucide-react';
import Link from 'next/link';

export default function PackagesPage() {
  const { repoMeta, repoId, selectRepo } = useRepo();
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const loadGraph = async () => {
    try {
      const res = await fetch(`/api/repositories/${repoId}/graph`);
      if (res.ok) {
        const data = await res.json();
        setGraphData(data);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadGraph();
  }, [repoId]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      await fetch(`/api/repositories/${repoId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repoMeta)
      });
      await loadGraph();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const packageNodes = React.useMemo(() => {
    const packages = (graphData.nodes || []).filter((n) => n.type === 'Package');
    if (!searchTerm) return packages;
    return packages.filter((p) => p.label.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [graphData, searchTerm]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <NavigationHeader
        repoName={`${repoMeta.owner}/${repoMeta.repo}`}
        branch={repoMeta.branch}
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
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white flex items-center space-x-2">
              <Package className="w-5 h-5 text-amber-400" />
              <span>External Package Inventory</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Third-party npm packages extracted from AST imports and package.json metadata.
            </p>
          </div>

          <div className="w-72">
            <input
              type="text"
              placeholder="Filter packages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packageNodes.map((pkg) => {
            const usageCount = (graphData.edges || []).filter(
              (e) => e.target === pkg.id && e.type === 'DEPENDS_ON'
            ).length;

            return (
              <div
                key={pkg.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-sm font-mono font-bold text-slate-200">{pkg.label}</span>
                  </div>
                  <a
                    href={`https://www.npmjs.com/package/${pkg.label}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-slate-300"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="flex items-center space-x-1.5">
                    <FileCode className="w-3.5 h-3.5 text-blue-400" />
                    <span>In-repo File Usages:</span>
                  </span>
                  <span className="font-bold text-slate-200">{usageCount}</span>
                </div>

                <Link
                  href="/security"
                  className="flex items-center justify-center space-x-1.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-medium border border-slate-700 transition"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Check Security Exposure</span>
                </Link>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
