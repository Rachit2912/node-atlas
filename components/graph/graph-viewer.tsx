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
    const cols = Math.ceil(Math.sqrt(nodesCount * 1.5));

    const nodes: Node[] = graphData.nodes.map((n, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const isHighlighted = highlightSet.size > 0 && highlightSet.has(n.id);

      let borderColor = 'border-slate-700';
      let bgColor = 'bg-slate-900';
      let textColor = 'text-slate-200';

      if (n.type === 'File') {
        borderColor = 'border-blue-500/50';
        bgColor = 'bg-blue-950/40';
      } else if (n.type === 'Package') {
        borderColor = 'border-amber-500/50';
        bgColor = 'bg-amber-950/40';
      } else if (n.type === 'Service') {
        borderColor = 'border-purple-500/50';
        bgColor = 'bg-purple-950/40';
      }

      if (isHighlighted) {
        borderColor = 'border-red-500 ring-2 ring-red-500/50';
        bgColor = 'bg-red-950/80';
        textColor = 'text-white font-bold';
      }

      return {
        id: n.id,
        position: { x: col * 260 + 50, y: row * 120 + 50 },
        data: {
          label: (
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-md border ${borderColor} ${bgColor} ${textColor} text-xs font-mono shadow-md`}>
              {n.type === 'File' && <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
              {n.type === 'Package' && <Package className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
              {n.type === 'Service' && <Server className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
              <span className="truncate max-w-[180px]">{n.label}</span>
            </div>
          )
        },
        style: { background: 'transparent', border: 'none', padding: 0 }
      };
    });

    const edges: Edge[] = graphData.edges.map((e) => {
      const isHighlighted = highlightSet.has(e.source) && highlightSet.has(e.target);
      return {
        id: e.id || `${e.source}->${e.target}`,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        animated: isHighlighted,
        style: {
          stroke: isHighlighted ? '#ef4444' : '#475569',
          strokeWidth: isHighlighted ? 2.5 : 1.2
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isHighlighted ? '#ef4444' : '#475569'
        }
      };
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [graphData, highlightSet]);

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
