'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Network,
  RefreshCw,
  ShieldAlert,
  Package,
  Layers,
  GitBranch,
  Github,
  Play
} from 'lucide-react';

interface HeaderProps {
  repoName: string;
  branch: string;
  lastAnalyzed?: string;
  isAnalyzing: boolean;
  onAnalyze: () => void;
}

export function NavigationHeader({
  repoName,
  branch,
  lastAnalyzed,
  isAnalyzing,
  onAnalyze
}: HeaderProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Dependency Explorer', href: '/explorer', icon: Network },
    { label: 'Cycles', href: '/cycles', icon: RefreshCw },
    { label: 'Security Impact', href: '/security', icon: ShieldAlert },
    { label: 'Packages', href: '/packages', icon: Package }
  ];

  return (
    <div className="flex flex-col border-b border-slate-800 bg-slate-900/80 backdrop-blur">
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800/80">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-blue-500 font-bold text-lg tracking-tight">
            <Layers className="w-6 h-6 text-blue-400" />
            <span>NodeAtlas</span>
          </div>
          <span className="text-slate-600">/</span>
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded bg-slate-800/70 border border-slate-700/60 text-sm font-mono text-slate-200">
            <Github className="w-4 h-4 text-slate-400" />
            <span>{repoName}</span>
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-800/40 px-2 py-1 rounded border border-slate-800">
            <GitBranch className="w-3.5 h-3.5 text-slate-500" />
            <span>{branch}</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {lastAnalyzed && (
            <span className="text-xs text-slate-400 font-mono">
              Last analyzed: {new Date(lastAnalyzed).toLocaleTimeString()}
            </span>
          )}

          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium text-xs shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing Repository...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Analyze / Re-analyze</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-1 px-6 pt-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-2 px-3 py-2 text-xs font-medium border-b-2 transition ${
                isActive
                  ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
