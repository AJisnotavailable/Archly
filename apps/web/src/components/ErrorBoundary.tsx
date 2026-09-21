import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Archly React Uncaught Exception]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetState = () => {
    try {
      // Clear Archly specific keys from localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('archly_') || key.startsWith('blueprintai_') || key.startsWith('blueprint_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Failed to clear local storage:', e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails } = this.state;
      return (
        <div className="h-screen w-screen bg-[#07090e] text-slate-100 flex flex-col items-center justify-center p-4 font-sans select-none overflow-hidden">
          <div className="w-full max-w-xl glass-panel bg-[#090d16]/95 border border-white/[0.12] rounded-2xl p-6 sm:p-7 space-y-4 shadow-2xl">
            {/* Header */}
            <div className="flex items-center space-x-3.5 pb-4 border-b border-white/[0.08]">
              <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/20">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-base font-display font-bold text-white">
                  Frontend Execution Interrupted
                </div>
                <div className="text-xs text-slate-400">
                  An unexpected render exception was caught by Archly Safety Boundary.
                </div>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200 font-mono space-y-1">
              <div className="text-[10px] uppercase font-bold text-rose-400/80 tracking-wider">
                Exception Message
              </div>
              <div className="break-words font-medium">
                {error?.message || 'Unknown runtime exception occurred.'}
              </div>
            </div>

            {/* Collapsible Stack trace */}
            <div className="text-xs">
              <button
                type="button"
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                className="flex items-center space-x-1.5 text-slate-400 hover:text-slate-200 transition cursor-pointer text-[11px]"
              >
                {showDetails ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <span>{showDetails ? 'Hide Call Stack' : 'View Component Call Stack'}</span>
              </button>

              {showDetails && (
                <div className="mt-2.5 max-h-48 overflow-y-auto p-3.5 rounded-xl bg-black/40 border border-white/[0.08] text-[10px] text-slate-400 font-mono leading-relaxed whitespace-pre-wrap">
                  {errorInfo?.componentStack || error?.stack || 'No stack trace captured.'}
                </div>
              )}
            </div>

            {/* Recovery Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3.5 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={this.handleResetState}
                className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-rose-500/15 text-slate-300 hover:text-rose-300 border border-white/[0.08] hover:border-rose-500/30 text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer"
                title="Clears cached session state and reloads"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Cache</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 rounded-xl btn-primary font-semibold text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-glow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Application</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
