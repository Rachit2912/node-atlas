'use client';

import React, { useEffect, useState } from 'react';
import { NavigationHeader } from '@/components/navigation-header';
import { GraphViewer } from '@/components/graph/graph-viewer';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

export default function CyclesPage() {
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const repoMeta = {
    owner: 'nodeatlas-org',
    repo: 'ecommerce-microservices-demo',
    branch: 'main'
  };
  const repoId = `repo_${repoMeta.owner}_${repoMeta.repo}`;

  const loadCycles = async () => {
    try {
      const res = await fetch(`/api/repositories/${repoId}/cycles`);
      if (res.ok) {
        const data = await res.json();
        setCycles(data);
        if (data.length > 0 && !selectedCycle) {
          setSelectedCycle(data[0]);
        }
      }

      const graphRes = await fetch(`/api/repositories/${repoId}/graph`);
      if (graphRes.ok) {
        const gData = await graphRes.json();
        setGraphData(gData);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadCycles();
  }, [repoId]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      await fetch(`/api/repositories/${repoId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repoMeta)
      });
      await loadCycles();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const cycleNodeIds = React.useMemo(() => {
    if (!selectedCycle || !selectedCycle.path) return [];
    return selectedCycle.path.map((filepath: string) => `file_${repoId}_${filepath.replace(/[/.]/g, '_')}`);
  }, [selectedCycle, repoId]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <NavigationHeader
        repoName={`${repoMeta.owner}/${repoMeta.repo}`}
        branch={repoMeta.branch}
        isAnalyzing={isAnalyzing}
        onAnalyze={handleAnalyze}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-96 border-r border-slate-800 bg-slate-900/50 p-4 flex flex-col space-y-4">
          <div>
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-semibold text-slate-200">Cycle Analyzer</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Tarjan SCC detected circular dependencies. Select a cycle to view its loop graph.
            </p>
          </div>

          {cycles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-950 rounded-lg border border-slate-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
              <p className="text-xs font-semibold text-slate-300">Zero Circular Dependencies</p>
              <p className="text-[11px] text-slate-500 mt-1">No circular dependency paths found in this repository.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {cycles.map((cycle) => {
                const isSelected = selectedCycle?.id === cycle.id;
                return (
                  <button
                    key={cycle.id}
                    onClick={() => setSelectedCycle(cycle)}
                    className={`w-full text-left p-3 rounded-lg border text-xs font-mono transition ${
                      isSelected
                        ? 'bg-red-950/40 border-red-500/80 ring-1 ring-red-500/50 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-red-400">{cycle.id}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
                        {cycle.length} Nodes
                      </span>
                    </div>
                    <p className="text-slate-300 break-all leading-relaxed">{cycle.pathString}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-1 p-4 bg-slate-950 flex flex-col">
          {selectedCycle && (
            <div className="mb-3 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">
                Focused Cycle Loop: <strong className="text-red-400">{selectedCycle.id}</strong>
              </span>
              <span className="text-slate-300">{selectedCycle.pathString}</span>
            </div>
          )}

          <div className="flex-1">
            <GraphViewer
              graphData={graphData}
              highlightNodeIds={cycleNodeIds}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
