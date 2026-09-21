import React, { useState, useEffect } from 'react';
import {
  Zap,
  Cpu,
  RefreshCw,
  X,
  Play,
  Server,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { ProviderId, AIModel, STAGE_DEFINITIONS } from '@archly/shared-types';
import { fetchModels } from '../lib/api';

interface HeroInputProps {
  prompt: string;
  setPrompt: (v: string) => void;
  provider: ProviderId;
  setProvider: (p: ProviderId) => void;
  model: string;
  setModel: (m: string) => void;
  apiKeys: Record<ProviderId, string>;
  setApiKeyForProvider?: (p: ProviderId, key: string) => void;
  localBaseUrl: string;
  setLocalBaseUrl?: (url: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  onNavigateToSettings?: () => void;
}

export const HeroInput: React.FC<HeroInputProps> = ({
  prompt,
  setPrompt,
  provider,
  setProvider,
  model,
  setModel,
  apiKeys,
  setApiKeyForProvider,
  localBaseUrl,
  setLocalBaseUrl,
  onSubmit,
  isLoading,
  onNavigateToSettings,
}) => {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localPingStatus, setLocalPingStatus] = useState<'idle' | 'checking' | 'online' | 'offline'>('idle');

  const currentApiKey = apiKeys[provider] || '';

  // Fetch models whenever provider or localBaseUrl changes
  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setLoadingModels(true);
      setErrorMsg(null);
      if (provider === 'local_llm') setLocalPingStatus('checking');

      try {
        const list = await fetchModels(
          provider,
          currentApiKey,
          false,
          provider === 'local_llm' ? localBaseUrl : undefined
        );
        if (!isCancelled) {
          setModels(list);
          if (provider === 'local_llm') setLocalPingStatus('online');
          if (list.length > 0 && (!model || !list.some((m) => m.id === model))) {
            const rec = list.find((m) => m.tags?.includes('Recommended')) || list[0];
            setModel(rec.id);
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          setErrorMsg(err.message);
          if (provider === 'local_llm') setLocalPingStatus('offline');
        }
      } finally {
        if (!isCancelled) setLoadingModels(false);
      }
    };
    load();
    return () => {
      isCancelled = true;
    };
  }, [provider, localBaseUrl]);

  const handleRefreshModels = async () => {
    setLoadingModels(true);
    setErrorMsg(null);
    if (provider === 'local_llm') setLocalPingStatus('checking');
    try {
      const list = await fetchModels(
        provider,
        currentApiKey,
        true,
        provider === 'local_llm' ? localBaseUrl : undefined
      );
      setModels(list);
      if (provider === 'local_llm') setLocalPingStatus('online');
      if (list.length > 0 && !list.some((m) => m.id === model)) {
        setModel(list[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
      if (provider === 'local_llm') setLocalPingStatus('offline');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      const canExecute = prompt.trim().length >= 5 && (provider === 'local_llm' || currentApiKey);
      if (!isLoading && canExecute) {
        onSubmit();
      }
    }
  };

  const canExecute =
    !isLoading && prompt.trim().length >= 5 && (provider === 'local_llm' || !!currentApiKey);

  return (
    <div className="w-full h-full min-h-0 flex flex-col font-sans">
      {/* Terminal Window Card with Glassmorphic Accent */}
      <div className="terminal-window w-full h-full flex flex-col rounded-2xl border border-white/[0.08] bg-[#0c101a]/90 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Titlebar with Traffic Indicators */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-white/[0.08] bg-[#090d16]/90 shrink-0 select-none">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
            </div>
            <div className="h-4 w-px bg-white/10 mx-1"></div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-white tracking-tight font-display">
                Archly Studio Workspace
              </span>
              <span className="text-[10px] text-slate-400 font-mono px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.05] hidden md:inline">
                14-Stage Autonomous Pipeline
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-emerald-400 font-mono text-[11px] font-semibold flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>COMPILER READY</span>
            </span>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-5 flex flex-col justify-between space-y-3.5">
          <div className="space-y-3 flex-1 flex flex-col min-h-0">

            {/* Prompt Input Container */}
            <div className="flex-1 min-h-[120px] flex flex-col space-y-1.5">
              <div className="flex items-center justify-between text-xs shrink-0">
                <span className="text-xs font-semibold text-slate-300">
                  Concept & Architectural Intent
                </span>
                {prompt && (
                  <button
                    type="button"
                    onClick={() => setPrompt('')}
                    className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <X className="w-3 h-3" />
                    <span>Clear Input</span>
                  </button>
                )}
              </div>

              <div className="flex-1 flex flex-col rounded-xl bg-[#090d16] border border-white/[0.1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/25 focus-within:shadow-[0_0_24px_rgba(59,130,246,0.15)] transition-all min-h-[100px] overflow-hidden">
                <div className="flex-1 flex items-start p-3.5 space-x-2.5 min-h-0">
                  <span className="text-blue-500 font-mono font-bold text-sm select-none mt-0.5">
                    ❯
                  </span>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe your software project (e.g. 'A high-throughput distributed message queue with SQLite WAL persistence and WebSockets dashboard')..."
                    className="w-full h-full bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none text-xs sm:text-sm font-mono resize-none leading-relaxed min-h-[80px]"
                  />
                </div>

                {/* Bottom Status Bar with Character Counter */}
                <div className="px-3.5 py-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400 bg-[#070a12] shrink-0 select-none font-mono">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-300 font-medium">{prompt.length}</span>
                    <span>chars</span>
                    <span className="terminal-cursor"></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="hidden sm:inline text-slate-500">Fast execute:</span>
                    <kbd className="px-2 py-0.5 rounded-md bg-[#131929] border border-white/10 text-[10px] text-slate-300 font-semibold shadow-sm">
                      Ctrl + Enter
                    </kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls Footer */}
          <div className="space-y-3 shrink-0 pt-2 border-t border-white/[0.08]">
            {/* 1. Inference Engine Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold text-[11px] uppercase tracking-wider">
                  1. Inference Engine
                </span>
                <span className="text-[10px] font-mono text-blue-400 font-medium">
                  {provider === 'local_llm' ? 'OFFLINE LOCAL ENGINE' : 'BYOK CREDENTIALS ACTIVE'}
                </span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {/* OpenRouter */}
                <button
                  type="button"
                  onClick={() => setProvider('openrouter')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    provider === 'openrouter'
                      ? 'bg-blue-600/15 border-blue-500/60 shadow-[0_0_16px_rgba(59,130,246,0.25)] ring-1 ring-blue-500/40 text-blue-200'
                      : 'bg-[#090d16] border-white/[0.08] text-slate-300 hover:border-white/20 hover:bg-[#0f1422]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="truncate">OpenRouter</span>
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-1 font-mono">
                    Free auto-router catalog.
                  </div>
                </button>

                {/* Groq Cloud */}
                <button
                  type="button"
                  onClick={() => setProvider('groq')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    provider === 'groq'
                      ? 'bg-blue-600/15 border-blue-500/60 shadow-[0_0_16px_rgba(59,130,246,0.25)] ring-1 ring-blue-500/40 text-blue-200'
                      : 'bg-[#090d16] border-white/[0.08] text-slate-300 hover:border-white/20 hover:bg-[#0f1422]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="truncate">Groq Cloud</span>
                    <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-1 font-mono">
                    Ultra-fast LPU inference.
                  </div>
                </button>

                {/* NVIDIA NIM */}
                <button
                  type="button"
                  onClick={() => setProvider('nvidia_nim')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    provider === 'nvidia_nim'
                      ? 'bg-blue-600/15 border-blue-500/60 shadow-[0_0_16px_rgba(59,130,246,0.25)] ring-1 ring-blue-500/40 text-blue-200'
                      : 'bg-[#090d16] border-white/[0.08] text-slate-300 hover:border-white/20 hover:bg-[#0f1422]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="truncate">NVIDIA NIM</span>
                    <Cpu className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-1 font-mono">
                    Nemotron & open models.
                  </div>
                </button>

                {/* Local LLM */}
                <button
                  type="button"
                  onClick={() => setProvider('local_llm')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    provider === 'local_llm'
                      ? 'bg-blue-600/15 border-blue-500/60 shadow-[0_0_16px_rgba(59,130,246,0.25)] ring-1 ring-blue-500/40 text-blue-200'
                      : 'bg-[#090d16] border-white/[0.08] text-slate-300 hover:border-white/20 hover:bg-[#0f1422]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="truncate">Local LLM</span>
                    <Server className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-1 font-mono">
                    Ollama / LM Studio / vLLM.
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Model Selection & Credentials Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {/* Model Dropdown */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold text-[11px]">2. Model Selection</span>
                  <button
                    type="button"
                    onClick={handleRefreshModels}
                    disabled={loadingModels}
                    className="text-[11px] text-cyan-400 hover:underline flex items-center space-x-1 disabled:opacity-50 cursor-pointer font-mono"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingModels ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="relative">
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    disabled={loadingModels || models.length === 0}
                    className="w-full bg-[#090d16] border border-white/[0.1] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl p-2.5 text-xs text-slate-100 font-mono focus:outline-none cursor-pointer"
                  >
                    {models.map((m: AIModel) => (
                      <option key={m.id} value={m.id} className="bg-[#0e121b] text-slate-100">
                        {m.name} {m.tags ? `[${m.tags.join(', ')}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Engine Status Card */}
              <div className="space-y-1 flex flex-col justify-end">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold text-[11px]">Credentials & Status</span>
                  {onNavigateToSettings && (
                    <button
                      type="button"
                      onClick={onNavigateToSettings}
                      className="text-[11px] text-cyan-400 hover:underline flex items-center space-x-1 cursor-pointer font-mono"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>Settings</span>
                    </button>
                  )}
                </div>

                <div className="h-[42px] px-3.5 rounded-xl bg-[#090d16] border border-white/[0.1] flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 truncate">
                    {provider === 'local_llm' ? (
                      <>
                        <Server className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="text-[11px] text-slate-300 font-mono truncate">
                          Local Endpoint:{' '}
                          <span className="text-white font-semibold">{localBaseUrl}</span>
                        </span>
                      </>
                    ) : currentApiKey ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-[11px] text-emerald-400 font-semibold font-mono truncate">
                          {provider.toUpperCase()} Key Configured
                        </span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-[11px] text-amber-300 font-mono truncate">
                          No Key Configured (Free Models)
                        </span>
                      </>
                    )}
                  </div>

                  {onNavigateToSettings && (
                    <button
                      type="button"
                      onClick={onNavigateToSettings}
                      className="px-2.5 py-1 rounded-lg bg-[#141b2b] hover:bg-[#1a2338] border border-white/10 hover:border-white/20 text-[10px] text-slate-300 hover:text-white font-semibold shrink-0 cursor-pointer ml-2 transition-all font-mono"
                    >
                      Configure
                    </button>
                  )}
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs rounded-xl font-mono">
                {errorMsg}
              </div>
            )}

            {/* Glowing Action Button */}
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canExecute}
              className="w-full py-3 px-5 rounded-xl btn-primary font-display font-bold text-sm flex items-center justify-center space-x-2.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-glow-md"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Compiling Technical Architecture ({STAGE_DEFINITIONS.length} Documents)...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Compile Technical Architecture</span>
                  <span className="text-xs text-white/70 font-mono font-normal ml-2 hidden sm:inline">
                    [Ctrl + Enter]
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default HeroInput;
