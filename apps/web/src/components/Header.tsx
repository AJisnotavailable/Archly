import React from 'react';
import {
  Layers,
  History,
  Sliders,
  Settings,
  Radio,
  CheckCircle2,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { ProviderId } from '@archly/shared-types';

interface HeaderProps {
  currentView: 'hero' | 'generating' | 'results' | 'history' | 'prompt-lab' | 'settings';
  onNavigate: (view: 'hero' | 'history' | 'prompt-lab' | 'settings') => void;
  activeProvider: ProviderId;
  hasApiKey: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  activeProvider,
  hasApiKey,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#090d16]/85 backdrop-blur-md select-none transition-colors">
      <div className="w-full px-3 sm:px-6 h-14 flex items-center justify-between">
        {/* Left: Official Emblem & Slogan */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => onNavigate('hero')}
            className="flex items-center space-x-3 cursor-pointer group text-left transition"
          >
            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/10 bg-[#07090e] p-0.5 group-hover:border-blue-500/60 group-hover:shadow-[0_0_16px_rgba(59,130,246,0.35)] transition-all">
              <img src="/logo.png" alt="Archly" className="w-full h-full object-cover rounded-md" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base tracking-tight text-white font-display">
                  Archly
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/25">
                  v2.0
                </span>
              </div>
              <span className="text-[10px] text-slate-400 tracking-wider uppercase font-medium hidden md:inline">
                Autonomous Architecture Compiler
              </span>
            </div>
          </button>
        </div>

        {/* Center: Modern Pill Navigation Tabs */}
        <nav className="flex items-center space-x-1 bg-[#070a12]/90 p-1 rounded-xl border border-white/[0.08] shadow-inner">
          <button
            type="button"
            onClick={() => onNavigate('hero')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-2 cursor-pointer ${
              currentView === 'hero'
                ? 'bg-blue-600/15 text-blue-300 font-semibold border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.25)]'
                : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] border border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Studio</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-2 cursor-pointer ${
              currentView === 'history'
                ? 'bg-blue-600/15 text-blue-300 font-semibold border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.25)]'
                : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] border border-transparent'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('prompt-lab')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-2 cursor-pointer ${
              currentView === 'prompt-lab'
                ? 'bg-blue-600/15 text-blue-300 font-semibold border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.25)]'
                : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] border border-transparent'
            }`}
            title="Prompt Engineering Lab (Customize Stage Meta-Prompts)"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Prompt Lab</span>
            <span className="sm:hidden">Lab</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-2 cursor-pointer ${
              currentView === 'settings'
                ? 'bg-blue-600/15 text-blue-300 font-semibold border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.25)]'
                : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] border border-transparent'
            }`}
            title="Settings & API Credentials"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </nav>

        {/* Right: Engine Indicator Pill with Glow & Status */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg bg-[#0e1422] hover:bg-[#141b2e] border border-white/[0.08] hover:border-blue-500/40 text-xs transition-all cursor-pointer shadow-sm group"
            title="Click to manage API Keys in Settings"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white uppercase font-mono hidden sm:inline">
              {activeProvider === 'local_llm'
                ? 'LOCAL-LLM'
                : activeProvider === 'nvidia_nim'
                ? 'NVIDIA-NIM'
                : activeProvider === 'groq'
                ? 'GROQ LPU'
                : activeProvider === 'demo'
                ? 'DEMO'
                : 'OPENROUTER'}
            </span>
            <span className="text-white/20 hidden sm:inline">|</span>
            {activeProvider === 'local_llm' ? (
              <span className="text-emerald-400 flex items-center space-x-1 text-[11px] font-mono font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>OFFLINE</span>
              </span>
            ) : hasApiKey ? (
              <span className="text-cyan-400 flex items-center space-x-1 text-[11px] font-mono font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>KEY:OK</span>
              </span>
            ) : (
              <span className="text-amber-400 flex items-center space-x-1 text-[11px] font-mono font-medium">
                <KeyRound className="w-3.5 h-3.5" />
                <span>KEY:REQ</span>
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

