import React, { useState } from 'react';
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  X,
  RefreshCw,
  Trash2,
  ArrowLeft,
  Cpu,
  Github,
} from 'lucide-react';
import { ProviderId } from '@archly/shared-types';
import { useDialog } from '../context/DialogContext';
import { openExternalUrl } from '../lib/api';

interface SettingsViewProps {
  apiKeys: Record<ProviderId, string>;
  onSetApiKey: (provider: ProviderId, key: string) => void;
  localBaseUrl: string;
  onSetLocalBaseUrl: (url: string) => void;
  onBackToStudio: () => void;
}

const PROVIDER_METADATA: {
  id: ProviderId;
  name: string;
  description: string;
  docsUrl: string;
  placeholder: string;
  iconColor: string;
}[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter Cloud API',
    description: 'Universal gateway to hundreds of open & proprietary models with free & paid tiers.',
    docsUrl: 'https://openrouter.ai/keys',
    placeholder: 'sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    iconColor: 'text-[#38bdf8]',
  },
  {
    id: 'groq',
    name: 'Groq LPU Cloud',
    description: 'Ultra-low latency inference engine powered by custom LPU hardware.',
    docsUrl: 'https://console.groq.com/keys',
    placeholder: 'gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    iconColor: 'text-[#3b82f6]',
  },
  {
    id: 'nvidia_nim',
    name: 'NVIDIA NIM API',
    description: 'Optimized enterprise containers running on NVIDIA DGX cloud infrastructure.',
    docsUrl: 'https://build.nvidia.com/',
    placeholder: 'nvapi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    iconColor: 'text-emerald-400',
  },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  apiKeys,
  onSetApiKey,
  localBaseUrl,
  onSetLocalBaseUrl,
  onBackToStudio,
}) => {
  const dialog = useDialog();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [localPingStatus, setLocalPingStatus] = useState<'idle' | 'testing' | 'online' | 'offline'>('idle');
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const toggleShowKey = (providerId: string) => {
    setShowKeys((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const showToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleKeyChange = (providerId: ProviderId, value: string) => {
    onSetApiKey(providerId, value);
    showToast(`${providerId.toUpperCase()} key updated`);
  };

  const testLocalEndpoint = async () => {
    setLocalPingStatus('testing');
    setPingLatency(null);
    const start = performance.now();
    try {
      const res = await fetch(`${localBaseUrl.replace(/\/$/, '')}/models`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const elapsed = Math.round(performance.now() - start);
      setPingLatency(elapsed);
      setLocalPingStatus('online');
      showToast(`Local LLM online (${elapsed}ms)`);
    } catch {
      setPingLatency(null);
      setLocalPingStatus('offline');
      showToast('Could not connect to local LLM server');
    }
  };

  const handleClearAllKeys = async () => {
    const confirmed = await dialog.confirm({
      title: 'Clear Stored API Keys',
      message: 'Are you sure you want to clear all stored API keys from this device? You will need to re-enter your credentials to query cloud AI providers.',
      confirmText: 'Clear All Keys',
      cancelText: 'Keep Keys',
      type: 'danger',
    });
    if (confirmed) {
      onSetApiKey('openrouter', '');
      onSetApiKey('groq', '');
      onSetApiKey('nvidia_nim', '');
      showToast('All API keys cleared');
    }
  };

  return (
    <div className="w-full h-full max-w-5xl mx-auto px-4 sm:px-8 py-6 space-y-6 font-sans overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div className="flex items-center space-x-3.5">
          <button
            type="button"
            onClick={onBackToStudio}
            className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.08] text-slate-300 hover:text-white transition cursor-pointer flex items-center space-x-1.5 text-xs font-medium"
            title="Return to Studio"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Studio</span>
          </button>
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400">
              <KeyRound className="w-4 h-4 text-blue-400" />
              <span>System Configuration</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 font-normal">Archly Engine Settings</span>
            </div>
            <h1 className="text-xl font-display font-bold text-white tracking-tight mt-0.5">
              Inference Engines & API Credentials
            </h1>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-2.5">
          {saveToast && (
            <div className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 font-semibold flex items-center space-x-1.5 animate-in fade-in shadow-glow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              <span>{saveToast}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => openExternalUrl('https://github.com/AJisnotavailable/')}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-blue-500/40 text-xs text-slate-300 hover:text-white flex items-center space-x-2 transition cursor-pointer group hover:bg-white/[0.08]"
            title="Developed by AJisnotavailable (Click to open GitHub)"
          >
            <Github className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="text-slate-500 hidden sm:inline text-[11px]">Built by</span>
            <span className="font-mono text-slate-200 font-semibold group-hover:text-blue-300 transition-colors">AJisnotavailable</span>
            <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-slate-300" />
          </button>
        </div>
      </div>

      {/* Section 1: Cloud API Providers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-display font-bold text-white">
            <KeyRound className="w-4 h-4 text-blue-400" />
            <span>1. Cloud Inference Providers</span>
          </div>
          <span className="text-[11px] text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.06]">
            Encrypted Client Storage
          </span>
        </div>

        <div className="space-y-3">
          {PROVIDER_METADATA.map((p) => {
            const currentVal = apiKeys[p.id] || '';
            const isVisible = !!showKeys[p.id];
            const hasKey = currentVal.trim().length > 0;

            return (
              <div
                key={p.id}
                className="glass-card rounded-xl p-4 sm:p-5 border border-white/[0.08] hover:border-blue-500/30 transition-all duration-200 space-y-3.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-display font-bold text-sm text-white">{p.name}</span>
                      {hasKey ? (
                        <span className="text-emerald-400 text-[10px] flex items-center space-x-1 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>CONFIGURED</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px] bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">
                          NOT CONFIGURED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openExternalUrl(p.docsUrl)}
                    className="self-start sm:self-center px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-blue-500/40 text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1.5 transition cursor-pointer font-medium"
                  >
                    <span>Get API Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* Input with Controls */}
                <div className="relative">
                  <input
                    type={isVisible ? 'text' : 'password'}
                    value={currentVal}
                    onChange={(e) => handleKeyChange(p.id, e.target.value)}
                    placeholder={p.placeholder}
                    className="w-full bg-[#090d16]/80 border border-white/[0.08] focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/20 rounded-xl py-2.5 px-3.5 pr-20 text-xs text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none transition-all"
                  />
                  <div className="absolute right-2.5 top-2 flex items-center space-x-1">
                    {hasKey && (
                      <button
                        type="button"
                        onClick={() => handleKeyChange(p.id, '')}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/5 transition cursor-pointer"
                        title="Clear key"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleShowKey(p.id)}
                      className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition cursor-pointer"
                      title={isVisible ? 'Hide key' : 'Reveal key'}
                    >
                      {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Local LLM Engine */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-display font-bold text-white">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>2. Local LLM Server & Endpoint</span>
          </div>
          <div className="flex items-center space-x-2">
            {localPingStatus === 'online' && (
              <span className="text-emerald-400 text-xs flex items-center space-x-1.5 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ONLINE {pingLatency ? `(${pingLatency}ms)` : ''}</span>
              </span>
            )}
            {localPingStatus === 'offline' && (
              <span className="text-amber-400 text-xs flex items-center space-x-1.5 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>UNREACHABLE</span>
              </span>
            )}
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 sm:p-5 border border-white/[0.08] hover:border-emerald-500/30 transition-all duration-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-xs text-slate-400">
                Connect directly to your local runtime such as Ollama, LM Studio, vLLM, or LocalAI with zero telemetry.
              </p>
            </div>

            <button
              type="button"
              onClick={testLocalEndpoint}
              disabled={localPingStatus === 'testing'}
              className="self-start sm:self-center px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-emerald-500/40 text-xs text-emerald-400 font-semibold flex items-center space-x-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${localPingStatus === 'testing' ? 'animate-spin' : ''}`} />
              <span>{localPingStatus === 'testing' ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>

          {/* Endpoint Input */}
          <div className="relative">
            <input
              type="text"
              value={localBaseUrl}
              onChange={(e) => onSetLocalBaseUrl(e.target.value.trim())}
              placeholder="http://localhost:11434/v1"
              className="w-full bg-[#090d16]/80 border border-white/[0.08] focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/20 rounded-xl py-2.5 px-3.5 text-xs text-slate-100 font-mono focus:outline-none transition-all"
            />
          </div>

          {/* Presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-400 font-medium">Quick Presets:</span>
            {[
              { label: 'Ollama :11434', url: 'http://localhost:11434/v1' },
              { label: 'LM Studio :1234', url: 'http://localhost:1234/v1' },
              { label: 'vLLM :8000', url: 'http://localhost:8000/v1' },
              { label: 'Localhost :5000', url: 'http://localhost:5000/v1' },
            ].map((preset) => {
              const isActive = localBaseUrl.includes(preset.url.split('/')[2]);
              return (
                <button
                  key={preset.url}
                  type="button"
                  onClick={() => {
                    onSetLocalBaseUrl(preset.url);
                    showToast(`Switched to ${preset.label}`);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold shadow-glow-cyan'
                      : 'bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-white hover:border-white/[0.18] hover:bg-white/[0.08]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 3: Developer & Engineering Attribution */}
      <div className="glass-card rounded-xl p-5 border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Github className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-display font-bold text-white tracking-wide">
                Developed & Engineered by AJisnotavailable
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 font-semibold">
                CREATOR
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Archly — Autonomous Architecture Compiler & Engineering Specification Engine.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openExternalUrl('https://github.com/AJisnotavailable/')}
          className="self-start sm:self-center px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-blue-500/40 text-xs font-semibold text-slate-200 hover:text-white flex items-center space-x-2 transition cursor-pointer shrink-0 group"
          title="Open GitHub profile"
        >
          <Github className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
          <span>github.com/AJisnotavailable</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
        </button>
      </div>

      {/* Bottom Action Bar: Clear Keys */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/[0.08]">
        <button
          type="button"
          onClick={handleClearAllKeys}
          className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-300 text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer self-start"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear All Stored Credentials</span>
        </button>

        <button
          type="button"
          onClick={() => openExternalUrl('https://github.com/AJisnotavailable/')}
          className="flex items-center space-x-2 text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition self-start sm:self-auto cursor-pointer group"
          title="Visit GitHub Profile"
        >
          <Github className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
          <span className="text-slate-500">Engineered by</span>
          <span className="text-slate-300 font-semibold group-hover:text-blue-300 transition-colors">AJisnotavailable</span>
          <ExternalLink className="w-3 h-3 text-slate-500" />
        </button>
      </div>
    </div>
  );
};
export default SettingsView;
