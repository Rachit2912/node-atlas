'use client';

import React, { useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType
} from '@xyflow/react';
import {
  FileCode,
  Package as PackageIcon,
  Server,
  AlertTriangle,
  Search,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Sparkles,
  Layers,
  ChevronRight,
  Database
} from 'lucide-react';

interface GraphViewerProps {
  graphData: {
    nodes: Array<{
      id: string;
      label: string;
      type: string;
      properties?: Record<string, any>;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      type: string;
      properties?: Record<string, any>;
    }>;
  };
  highlightNodeIds?: string[];
  onSelectNode?: (node: any) => void;
}

export function GraphViewer({
  graphData,
  highlightNodeIds = [],
  onSelectNode
}: GraphViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleTypes, setVisibleTypes] = useState<Record<string, boolean>>({
    File: true,
    Package: true,
    PackageVersion: true,
    Service: true,
    Repository: true
  });
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);

  const highlightSet = useMemo(() => new Set(highlightNodeIds), [highlightNodeIds]);

  // Aggregate statistics for node labels & relationships matching CognoDB Browser sidebar
  const stats = useMemo(() => {
    const counts: Record<string, number> = {
      File: 0,
      Package: 0,
      PackageVersion: 0,
      Service: 0,
      Repository: 0
    };
    graphData.nodes.forEach((n) => {
      const t = n.type || 'File';
      counts[t] = (counts[t] || 0) + 1;
    });

    const relCounts: Record<string, number> = {};
    graphData.edges.forEach((e) => {
      const rel = e.type || 'DEPENDS_ON';
      relCounts[rel] = (relCounts[rel] || 0) + 1;
    });

    return { counts, relCounts, totalNodes: graphData.nodes.length, totalEdges: graphData.edges.length };
  }, [graphData]);

  const filteredData = useMemo(() => {
    const nodes = graphData.nodes.filter((n) => {
      const matchesType = visibleTypes[n.type] !== false;
      const matchesSearch = !searchTerm || n.label.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });

    const validNodeIds = new Set(nodes.map((n) => n.id));

    const edges = graphData.edges.filter(
      (e) => validNodeIds.has(e.source) && validNodeIds.has(e.target)
    );

    return { nodes, edges };
  }, [graphData, visibleTypes, searchTerm]);

  const { initialNodes, initialEdges } = useMemo(() => {
    const nodesCount = filteredData.nodes.length;
    // Circular / Spiral layout positioning for authentic CognoDB graph network look
    const radiusStep = 180;
    const center = { x: 450, y: 350 };

    let cycleStartNodeId: string | null = null;
    let cycleEndNodeId: string | null = null;

    if (highlightNodeIds.length > 0) {
      cycleStartNodeId = highlightNodeIds[0];
      if (highlightNodeIds.length > 1) {
        const lastIdx = highlightNodeIds.length - 1;
        if (highlightNodeIds[lastIdx] === highlightNodeIds[0] && highlightNodeIds.length > 2) {
          cycleEndNodeId = highlightNodeIds[lastIdx - 1];
        } else {
          cycleEndNodeId = highlightNodeIds[lastIdx];
        }
      }
    }

    const nodes: Node[] = filteredData.nodes.map((n, idx) => {
      // Calculate layout coordinates
      let x = center.x;
      let y = center.y;
      if (nodesCount > 1) {
        const angle = (idx / nodesCount) * 2 * Math.PI;
        const ring = Math.floor(idx / 8) + 1;
        const r = ring * radiusStep + (idx % 2 === 0 ? 30 : -30);
        x = center.x + r * Math.cos(angle);
        y = center.y + r * Math.sin(angle);
      }

      const isStartNode = n.id === cycleStartNodeId;
      const isEndNode = n.id === cycleEndNodeId;
      const isCycleNode = highlightSet.has(n.id);

      // Node style definitions based on CognoDB Browser
      let orbGradient = 'from-amber-400 via-orange-500 to-amber-700 shadow-orange-500/40 border-orange-300/50';
      let icon = <FileCode className="w-5 h-5 text-white drop-shadow" />;
      let badgeLabel = n.type || 'File';

      if (n.type === 'Package') {
        orbGradient = 'from-purple-300 via-indigo-500 to-purple-800 shadow-purple-500/40 border-purple-300/50';
        icon = <PackageIcon className="w-5 h-5 text-white drop-shadow" />;
      } else if (n.type === 'PackageVersion') {
        orbGradient = 'from-cyan-300 via-teal-400 to-cyan-700 shadow-cyan-500/40 border-cyan-300/50';
        icon = <Sparkles className="w-4 h-4 text-white drop-shadow" />;
      } else if (n.type === 'Service') {
        orbGradient = 'from-emerald-300 via-green-500 to-emerald-800 shadow-emerald-500/40 border-emerald-300/50';
        icon = <Server className="w-5 h-5 text-white drop-shadow" />;
      } else if (n.type === 'Repository') {
        orbGradient = 'from-pink-400 via-rose-500 to-pink-800 shadow-pink-500/40 border-pink-300/50';
        icon = <Database className="w-5 h-5 text-white drop-shadow" />;
      }

      if (isStartNode) {
        orbGradient = 'from-emerald-400 via-teal-400 to-emerald-600 shadow-emerald-400/80 border-white ring-4 ring-emerald-400/80 animate-pulse';
      } else if (isEndNode) {
        orbGradient = 'from-red-400 via-rose-600 to-red-800 shadow-red-500/80 border-white ring-4 ring-red-500/80 animate-pulse';
      } else if (isCycleNode) {
        orbGradient = 'from-amber-300 via-orange-500 to-red-600 shadow-amber-400/60 border-amber-200 ring-2 ring-amber-400/60';
      }

      return {
        id: n.id,
        position: { x, y },
        data: {
          label: (
            <div className="group relative flex flex-col items-center cursor-pointer select-none">
              {/* Glossy 3D Spherical Node */}
              <div
                className={`w-14 h-14 rounded-full bg-gradient-to-br ${orbGradient} shadow-xl border-2 flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}
              >
                {icon}
              </div>

              {/* Node Label Text Pill */}
              <div className="mt-1.5 flex flex-col items-center">
                <span className="px-2 py-0.5 rounded bg-slate-950/85 backdrop-blur-md border border-slate-800 text-[11px] font-mono font-medium text-slate-100 max-w-[180px] truncate shadow-md group-hover:text-blue-300 transition-colors">
                  {n.label}
                </span>

                {isStartNode && (
                  <span className="mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-emerald-500 text-slate-950 shadow">
                    Cycle Start
                  </span>
                )}
                {isEndNode && (
                  <span className="mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-red-500 text-white shadow">
                    Cycle End
                  </span>
                )}
              </div>
            </div>
          )
        },
        style: { background: 'transparent', border: 'none', padding: 0 }
      };
    });

    const edges: Edge[] = filteredData.edges.map((e) => {
      const isCycleEdge = highlightSet.has(e.source) && highlightSet.has(e.target);
      return {
        id: e.id || `${e.source}->${e.target}`,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        animated: isCycleEdge,
        label: e.type,
        labelStyle: { fill: isCycleEdge ? '#ef4444' : '#94a3b8', fontSize: 9, fontFamily: 'monospace', fontWeight: 600 },
        labelBgStyle: { fill: '#090d16', rx: 3, ry: 3, fillOpacity: 0.9 },
        style: {
          stroke: isCycleEdge ? '#ef4444' : '#475569',
          strokeWidth: isCycleEdge ? 2.5 : 1.5
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isCycleEdge ? '#ef4444' : '#475569'
        }
      };
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [filteredData, highlightSet, highlightNodeIds]);

  const toggleTypeVisibility = (type: string) => {
    setVisibleTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  if (!graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 bg-[#090d16] border border-slate-800/80 rounded-xl">
        <AlertTriangle className="w-10 h-10 mb-3 text-amber-500/80 animate-pulse" />
        <p className="text-sm font-semibold text-slate-300">No Graph Visualization Data Available</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm text-center">
          Connect a GitHub repository or toggle &quot;Demo Seed: ON&quot; in the navigation header to populate the graph database.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#070a12] rounded-xl overflow-hidden border border-slate-800 shadow-2xl font-sans">
      {/* Top Floating Search & Control Toolbar */}
      <div className="absolute top-4 left-4 z-20 flex items-center space-x-3 bg-[#0d1322]/90 backdrop-blur-md border border-slate-800/80 rounded-lg p-2 shadow-xl">
        <button
          onClick={() => setShowLeftSidebar(!showLeftSidebar)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded border text-xs font-mono transition ${
            showLeftSidebar
              ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
              : 'bg-slate-800/60 border-slate-700 text-slate-400'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{showLeftSidebar ? 'Hide Inspector' : 'Show Inspector'}</span>
        </button>

        <div className="flex items-center space-x-2 bg-[#050810] px-3 py-1.5 rounded border border-slate-800/80 w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search graph nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-200 focus:outline-none font-mono placeholder-slate-500"
          />
        </div>
      </div>

      {/* Authentic CognoDB Browser Left Sidebar */}
      {showLeftSidebar && (
        <div className="absolute top-16 left-4 z-20 bg-[#0d1322]/95 backdrop-blur-md border border-slate-800/90 rounded-xl p-3.5 w-64 shadow-2xl space-y-4 font-mono text-xs">
          {/* NODE LABELS Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800/80 pb-1.5">
              <span>NODE LABELS</span>
              <span className="text-[9px] text-slate-500 font-normal">click to toggle</span>
            </div>

            <div className="space-y-1">
              {/* Package Label */}
              <button
                onClick={() => toggleTypeVisibility('Package')}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-800/60 transition text-left"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50"></span>
                  <span className={visibleTypes.Package ? 'text-slate-200' : 'text-slate-600 line-through'}>
                    Package
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-semibold">
                  {stats.counts.Package || 0}
                </span>
              </button>

              {/* PackageVersion Label */}
              <button
                onClick={() => toggleTypeVisibility('PackageVersion')}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-800/60 transition text-left"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50"></span>
                  <span className={visibleTypes.PackageVersion ? 'text-slate-200' : 'text-slate-600 line-through'}>
                    PackageVersion
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-semibold">
                  {stats.counts.PackageVersion || 0}
                </span>
              </button>

              {/* File Label */}
              <button
                onClick={() => toggleTypeVisibility('File')}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-800/60 transition text-left"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50"></span>
                  <span className={visibleTypes.File ? 'text-slate-200' : 'text-slate-600 line-through'}>
                    File
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-semibold">
                  {stats.counts.File || 0}
                </span>
              </button>

              {/* Service Label */}
              <button
                onClick={() => toggleTypeVisibility('Service')}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-800/60 transition text-left"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                  <span className={visibleTypes.Service ? 'text-slate-200' : 'text-slate-600 line-through'}>
                    Service
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-semibold">
                  {stats.counts.Service || 0}
                </span>
              </button>
            </div>
          </div>

          {/* RELATIONSHIPS Section */}
          <div className="space-y-2 pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800/80 pb-1.5">
              <span>RELATIONSHIPS</span>
            </div>

            <div className="space-y-1 text-[11px] text-slate-300">
              {Object.entries(stats.relCounts).map(([relType, count]) => (
                <div key={relType} className="flex items-center justify-between px-2 py-1 rounded bg-slate-900/50">
                  <span className="text-slate-400 text-[10px]">— {relType}</span>
                  <span className="text-slate-300 font-semibold">{count}</span>
                </div>
              ))}
              {Object.keys(stats.relCounts).length === 0 && (
                <div className="text-[10px] text-slate-500 px-2 py-1">No relationships active</div>
              )}
            </div>
          </div>

          {/* Bottom CognoDB Stats Bar */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
            <span>{filteredData.nodes.length} nodes</span>
            <span>{filteredData.edges.length} rels</span>
          </div>
        </div>
      )}

      {/* Canvas */}
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        onNodeClick={(_, node) => {
          if (onSelectNode) {
            const rawNode = graphData.nodes.find((n) => n.id === node.id);
            onSelectNode(rawNode);
          }
        }}
        fitView
      >
        <Background color="#1e293b" gap={24} size={1} />
        <Controls className="bg-[#0d1322] border-slate-800 text-slate-200 fill-slate-200 rounded-lg overflow-hidden shadow-xl" />
        <MiniMap
          nodeColor={(node) => {
            if (node.id.includes('service')) return '#10b981';
            if (node.id.includes('file')) return '#f97316';
            if (node.id.includes('version')) return '#22d3ee';
            return '#a855f7';
          }}
          maskColor="rgba(7, 10, 18, 0.85)"
          className="bg-[#0d1322] border-slate-800 rounded-lg overflow-hidden shadow-xl"
        />
      </ReactFlow>

      {/* Bottom Hint Footer matching CognoDB Browser */}
      <div className="absolute bottom-3 right-4 z-10 text-[10px] font-mono text-slate-500 bg-[#0d1322]/80 backdrop-blur px-2.5 py-1 rounded border border-slate-800/60">
        click node to inspect &bull; drag to position &bull; scroll to zoom
      </div>
    </div>
  );
}
