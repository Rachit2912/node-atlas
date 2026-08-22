'use client';

import React, { useEffect, useState } from 'react';
import { NavigationHeader } from '@/components/navigation-header';
import { GraphViewer } from '@/components/graph/graph-viewer';
import { useRepo } from '@/lib/hooks/use-repo';
import { Search } from 'lucide-react';

export default function ExplorerPage() {
  const { repoMeta, repoId, selectRepo } = useRepo();
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const getSavedToken = () => {
    return typeof window !== 'undefined' ? localStorage.getItem('nodeatlas_github_token') || undefined : undefined;
  };

  const loadGraph = async () => {
    try {
      const token = getSavedToken();
      const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
      const res = await fetch(`/api/repositories/${repoId}/graph${tokenQuery}`);
      if (res.ok) {
        const data = await res.json();
        setGraphData(data || { nodes: [], edges: [] });
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
      const token = getSavedToken();
      await fetch(`/api/repositories/${repoId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...repoMeta, githubToken: token })
      });
      const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
      const res = await fetch(`/api/repositories/${repoId}/graph${tokenQuery}`);
      if (res.ok) {
        const data = await res.json();
        setGraphData(data);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredGraphData = React.useMemo(() => {
    let nodes = graphData.nodes || [];
    if (filterType !== 'All') {
      nodes = nodes.filter((n) => n.type === filterType);
    }
    if (searchTerm) {
      nodes = nodes.filter((n) => n.label.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    const validNodeIds = new Set(nodes.map((n) => n.id));
    const edges = (graphData.edges || []).filter(
      (e) => validNodeIds.has(e.source) && validNodeIds.has(e.target)
    );
    return { nodes, edges };
  }, [graphData, filterType, searchTerm]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden">
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

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r border-slate-800 bg-slate-900/50 p-4 flex flex-col space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Dependency Explorer</h2>
            <p className="text-xs text-slate-400 mt-1">
              Explore 1, 2, and 3-hop directed module relationships and npm packages.
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search file or package..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Node Type Filter</span>
            <div className="grid grid-cols-2 gap-1.5">
              {['All', 'File', 'Package', 'Service'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-2.5 py-1.5 rounded text-xs font-medium border text-left transition ${
                    filterType === type
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Visible Nodes:</span>
              <span className="font-mono text-slate-200">{filteredGraphData.nodes.length}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Visible Relationships:</span>
              <span className="font-mono text-slate-200">{filteredGraphData.edges.length}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 bg-slate-950">
          <GraphViewer
            graphData={filteredGraphData}
            onSelectNode={(node) => setSelectedNode(node)}
          />
        </div>

        {selectedNode && (
          <div className="w-80 border-l border-slate-800 bg-slate-900/50 p-4 flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Node Details</span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-500 hover:text-slate-300 text-xs"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[11px] text-slate-500 block">Identifier / Path</span>
                <p className="text-xs font-mono font-semibold text-blue-400 break-all mt-0.5">
                  {selectedNode.label}
                </p>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block">Type</span>
                <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono text-slate-300">
                  {selectedNode.type}
                </span>
              </div>

              {selectedNode.properties && (
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Properties</span>
                  <pre className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48">
                    {JSON.stringify(selectedNode.properties, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
