'use client';

import React, { useState, useEffect } from 'react';
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
  Play,
  Key,
  ChevronDown
} from 'lucide-react';

interface HeaderProps {
  repoName: string;
  branch: string;
  lastAnalyzed?: string;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onSelectRepo?: (repo: any) => void;
}

export function NavigationHeader({
  repoName,
  branch,
  lastAnalyzed,
  isAnalyzing,
  onAnalyze,
  onSelectRepo
}: HeaderProps) {
  const pathname = usePathname();
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [repositories, setRepositories] = useState<any[]>([]);
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async (token?: string) => {
    try {
      const url = token ? `/api/github/repositories?token=${encodeURIComponent(token)}` : '/api/github/repositories';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRepositories(data);
      }
    } catch {
      // Fallback
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/github/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput })
      });
      if (res.ok) {
        setIsConnected(true);
        setShowConnectModal(false);
        await fetchRepositories(tokenInput);
      }
    } catch {
      // Fallback
    }
  };

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

          {/* Repository Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRepoDropdown(!showRepoDropdown)}
              className="flex items-center space-x-2 px-3 py-1 rounded-md bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-mono text-slate-200 transition"
            >
              <Github className="w-4 h-4 text-slate-400" />
              <span>{repoName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {showRepoDropdown && (
              <div className="absolute left-0 mt-2 w-72 rounded-lg bg-slate-900 border border-slate-800 shadow-xl z-50 p-2 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1 block">Select Repository</span>
                {repositories.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => {
                      if (onSelectRepo) onSelectRepo(repo);
                      setShowRepoDropdown(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-xs font-mono text-slate-300 flex items-center justify-between"
                  >
                    <span className="truncate">{repo.fullName}</span>
                    <span className="text-[10px] text-slate-500 ml-2">{repo.defaultBranch}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-800/40 px-2 py-1 rounded border border-slate-800">
            <GitBranch className="w-3.5 h-3.5 text-slate-500" />
            <span>{branch}</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Connect GitHub Button */}
          <button
            onClick={() => setShowConnectModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
          >
            <Key className="w-3.5 h-3.5 text-slate-400" />
            <span>{isConnected ? 'GitHub Connected' : 'Connect GitHub'}</span>
          </button>

          {lastAnalyzed && (
            <span className="text-xs text-slate-400 font-mono hidden md:inline">
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

      {/* GitHub Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                <Github className="w-4 h-4 text-blue-400" />
                <span>Connect GitHub Personal Access Token</span>
              </h3>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-slate-500 hover:text-slate-300 text-xs"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Enter a GitHub Personal Access Token (`repo` scope) to list and select private repositories for NodeAtlas analysis. Token is never exposed to the client or saved in raw database logs.
            </p>
            <form onSubmit={handleConnect} className="space-y-3">
              <input
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition"
              >
                Connect GitHub Token
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
