'use client';

import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType
} from '@xyflow/react';
import { FileCode, Package, Server, AlertTriangle } from 'lucide-react';

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
  const highlightSet = useMemo(() => new Set(highlightNodeIds), [highlightNodeIds]);

  const { initialNodes, initialEdges } = useMemo(() => {
    const nodesCount = graphData.nodes.length;
    const cols = Math.ceil(Math.sqrt(nodesCount * 1.8));

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

    const nodes: Node[] = graphData.nodes.map((n, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;

      const isStartNode = n.id === cycleStartNodeId;
      const isEndNode = n.id === cycleEndNodeId;
      const isCycleNode = highlightSet.has(n.id);

      let borderColor = 'border-slate-700/80';
      let bgColor = 'bg-slate-900/90';
      let textColor = 'text-slate-200';
      let badge: React.ReactNode = null;

      if (n.type === 'File') {
        borderColor = 'border-blue-500/40';
        bgColor = 'bg-slate-900/95';
      } else if (n.type === 'Package') {
        borderColor = 'border-amber-500/40';
        bgColor = 'bg-amber-950/30';
      } else if (n.type === 'Service') {
        borderColor = 'border-purple-500/40';
        bgColor = 'bg-purple-950/30';
      }

      if (isStartNode) {
        borderColor = 'border-emerald-400 ring-2 ring-emerald-400/80 shadow-emerald-950/50 shadow-lg';
        bgColor = 'bg-emerald-950/90';
        textColor = 'text-emerald-100 font-bold';
        badge = (
          <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-extrabold bg-emerald-500 text-slate-950 ml-2 shadow-sm shrink-0">
            Cycle Start
          </span>
        );
      } else if (isEndNode) {
        borderColor = 'border-red-500 ring-2 ring-red-500/80 shadow-red-950/50 shadow-lg';
        bgColor = 'bg-red-950/90';
        textColor = 'text-red-100 font-bold';
        badge = (
          <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-extrabold bg-red-500 text-white ml-2 shadow-sm shrink-0">
            Cycle End
          </span>
        );
      } else if (isCycleNode) {
        borderColor = 'border-amber-500 ring-1 ring-amber-500/60';
        bgColor = 'bg-amber-950/70';
        textColor = 'text-amber-100 font-semibold';
        badge = (
          <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 ml-2 shrink-0">
            In Loop
          </span>
        );
      }

      return {
        id: n.id,
        position: { x: col * 320 + 40, y: row * 140 + 40 },
        data: {
          label: (
            <div className={`flex items-center space-x-2.5 px-3.5 py-2.5 rounded-lg border ${borderColor} ${bgColor} ${textColor} text-xs font-mono shadow-lg backdrop-blur-sm whitespace-nowrap min-w-[220px]`}>
              {n.type === 'File' && <FileCode className="w-4 h-4 text-blue-400 shrink-0" />}
              {n.type === 'Package' && <Package className="w-4 h-4 text-amber-400 shrink-0" />}
              {n.type === 'Service' && <Server className="w-4 h-4 text-purple-400 shrink-0" />}
              <span className="font-medium tracking-tight">{n.label}</span>
              {badge}
            </div>
          )
        },
        style: { background: 'transparent', border: 'none', padding: 0 }
      };
    });

    const edges: Edge[] = graphData.edges.map((e) => {
      const isCycleEdge = highlightSet.has(e.source) && highlightSet.has(e.target);
      return {
        id: e.id || `${e.source}->${e.target}`,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        animated: isCycleEdge,
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
  }, [graphData, highlightSet, highlightNodeIds]);

  if (!graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8">
        <AlertTriangle className="w-10 h-10 mb-3 text-slate-600" />
        <p className="text-sm font-medium">No graph data available.</p>
        <p className="text-xs text-slate-600 mt-1">Run repository analysis to generate graph visualizations.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
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
        <Background color="#334155" gap={16} />
        <Controls className="bg-slate-900 border-slate-800 text-slate-200 fill-slate-200" />
        <MiniMap
          nodeColor={(node) => {
            if (node.id.includes('service')) return '#a855f7';
            if (node.id.includes('file')) return '#3b82f6';
            return '#f59e0b';
          }}
          maskColor="rgba(15, 23, 42, 0.7)"
          className="bg-slate-900 border-slate-800 rounded"
        />
      </ReactFlow>
    </div>
  );
}
