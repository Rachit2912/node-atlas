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
  Package,
  Server,
  AlertTriangle,
  Search,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Layers,
  Sparkles
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
    Service: true
  });
  const [showLegend, setShowLegend] = useState(false);

  const highlightSet = useMemo(() => new Set(highlightNodeIds), [highlightNodeIds]);

  const stats = useMemo(() => {
    const fileCount = graphData.nodes.filter((n) => n.type === 'File').length;
    const pkgCount = graphData.nodes.filter((n) => n.type === 'Package').length;
    const svcCount = graphData.nodes.filter((n) => n.type === 'Service').length;
    const edgeCount = graphData.edges.length;
    return { fileCount, pkgCount, svcCount, edgeCount };
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
    const cols = Math.max(3, Math.ceil(Math.sqrt(nodesCount * 1.8)));

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
      const row = Math.floor(idx / cols);
      const col = idx % cols;

      const isStartNode = n.id === cycleStartNodeId;
      const isEndNode = n.id === cycleEndNodeId;
      const isCycleNode = highlightSet.has(n.id);

      let borderColor = 'border-slate-800 hover:border-blue-400';
      let bgColor = 'bg-slate-900/90';
      let textColor = 'text-slate-200';
      let glowStyle = 'shadow-md';
      let badge: React.ReactNode = null;
      let labelBadge = null;

      if (n.type === 'File') {
        borderColor = 'border-blue-500/50 hover:border-blue-400';
        bgColor = 'bg-slate-900/95';
        labelBadge = (
          <span className="text-[10px] font-mono text-blue-400 font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
            :File
          </span>
        );
      } else if (n.type === 'Package') {
        borderColor = 'border-amber-500/50 hover:border-amber-400';
        bgColor = 'bg-amber-950/40';
        labelBadge = (
          <span className="text-[10px] font-mono text-amber-400 font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
            :Package
          </span>
        );
      } else if (n.type === 'Service') {
        borderColor = 'border-purple-500/50 hover:border-purple-400';
        bgColor = 'bg-purple-950/40';
        labelBadge = (
          <span className="text-[10px] font-mono text-purple-400 font-semibold px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
            :Service
          </span>
        );
      }

      if (isStartNode) {
        borderColor = 'border-emerald-400 ring-2 ring-emerald-400/80';
        bgColor = 'bg-emerald-950/95';
        textColor = 'text-emerald-100 font-bold';
        glowStyle = 'shadow-xl shadow-emerald-500/20';
        badge = (
          <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-extrabold bg-emerald-500 text-slate-950 shadow-sm shrink-0">
            Cycle Start
          </span>
        );
      } else if (isEndNode) {
        borderColor = 'border-red-500 ring-2 ring-red-500/80';
        bgColor = 'bg-red-950/95';
        textColor = 'text-red-100 font-bold';
        glowStyle = 'shadow-xl shadow-red-500/20';
        badge = (
          <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-extrabold bg-red-500 text-white shadow-sm shrink-0">
            Cycle End
          </span>
        );
      } else if (isCycleNode) {
        borderColor = 'border-amber-500 ring-1 ring-amber-500/60';
        bgColor = 'bg-amber-950/80';
        textColor = 'text-amber-100 font-semibold';
        glowStyle = 'shadow-lg shadow-amber-500/20';
        badge = (
          <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
            In Loop
          </span>
        );
      }

      return {
        id: n.id,
        position: { x: col * 340 + 40, y: row * 160 + 40 },
        data: {
          label: (
            <div
              className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl border ${borderColor} ${bgColor} ${textColor} text-xs font-mono backdrop-blur-md whitespace-nowrap min-w-[240px] max-w-[360px] cursor-pointer transition-all duration-200 ${glowStyle}`}
            >
              <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 shrink-0">
                {n.type === 'File' && <FileCode className="w-4 h-4 text-blue-400" />}
                {n.type === 'Package' && <Package className="w-4 h-4 text-amber-400" />}
                {n.type === 'Service' && <Server className="w-4 h-4 text-purple-400" />}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center space-x-1.5">
                  {labelBadge}
                  {badge}
                </div>
                <span className="font-medium tracking-tight truncate mt-1 text-slate-200">{n.label}</span>
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
        labelStyle: { fill: isCycleEdge ? '#ef4444' : '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
        labelBgStyle: { fill: '#0f172a', rx: 4, ry: 4, fillOpacity: 0.8 },
        style: {
          stroke: isCycleEdge ? '#ef4444' : '#475569',
          strokeWidth: isCycleEdge ? 2.5 : 1.2
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
      <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 bg-slate-950 border border-slate-800 rounded-xl">
        <AlertTriangle className="w-10 h-10 mb-3 text-amber-500/80 animate-pulse" />
        <p className="text-sm font-semibold text-slate-300">No Graph Visualization Data Available</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm text-center">
          Connect a GitHub repository or toggle &quot;Demo Seed: ON&quot; in the navigation header to populate the graph database.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Top Search & Filter Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-3 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg p-2 shadow-lg">
        <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-md border border-slate-800 w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search graph nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-200 focus:outline-none font-mono"
          />
        </div>

        <button
          onClick={() => setShowLegend(!showLegend)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md border text-xs font-mono transition ${
            showLegend
              ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Legend Panel</span>
        </button>
      </div>

      {/* CognoDB Overlay Side Legend Panel */}
      {showLegend && (
        <div className="absolute top-16 left-4 z-10 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-4 w-72 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-200 tracking-wider uppercase">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>CognoDB Graph Model</span>
            </div>
            <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
              Cypher Engine
            </span>
          </div>

          {/* Node Labels Filter Section */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Node Labels</span>

            <div className="space-y-1.5">
              <button
                onClick={() => toggleTypeVisibility('File')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-xs font-mono transition"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>
                  <span className="text-slate-300">:File</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 font-bold">{stats.fileCount}</span>
                  {visibleTypes.File ? <Eye className="w-3.5 h-3.5 text-blue-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
                </div>
              </button>

              <button
                onClick={() => toggleTypeVisibility('Package')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-xs font-mono transition"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
                  <span className="text-slate-300">:Package</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 font-bold">{stats.pkgCount}</span>
                  {visibleTypes.Package ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
                </div>
              </button>

              <button
                onClick={() => toggleTypeVisibility('Service')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-xs font-mono transition"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50"></span>
                  <span className="text-slate-300">:Service</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 font-bold">{stats.svcCount}</span>
                  {visibleTypes.Service ? <Eye className="w-3.5 h-3.5 text-purple-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
                </div>
              </button>
            </div>
          </div>

          {/* Relationships Section */}
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Relationship Edges</span>
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-300">
              <span className="text-slate-400">Total Graph Edges</span>
              <span className="font-bold text-slate-200">{stats.edgeCount}</span>
            </div>
          </div>
        </div>
      )}

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
        <Background color="#1e293b" gap={20} size={1.5} />
        <Controls className="bg-slate-900 border-slate-800 text-slate-200 fill-slate-200 rounded-lg overflow-hidden shadow-xl" />
        <MiniMap
          nodeColor={(node) => {
            if (node.id.includes('service')) return '#a855f7';
            if (node.id.includes('file')) return '#3b82f6';
            return '#f59e0b';
          }}
          maskColor="rgba(15, 23, 42, 0.75)"
          className="bg-slate-900 border-slate-800 rounded-lg overflow-hidden shadow-xl"
        />
      </ReactFlow>
    </div>
  );
}
