import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Trash2,
  ChevronLeft,
  ExternalLink,
  RefreshCw,
  Search,
  X,
  History,
} from 'lucide-react';
import { ProjectData, STAGE_DEFINITIONS } from '@archly/shared-types';
import { fetchProjects, deleteProject, clearAllProjects, downloadBlob, toSafeSlug } from '../lib/api';

import { useDialog } from '../context/DialogContext';

interface HistoryViewProps {
  onOpenProject: (id: string) => void;
  onNewArchitecture?: () => void;
  onNewBlueprint?: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  onOpenProject,
  onNewArchitecture,
  onNewBlueprint,
}) => {
  const dialog = useDialog();
  const handleNew = onNewArchitecture || onNewBlueprint || (() => {});
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchProjects();
      setProjects(list);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = await dialog.confirm({
      title: 'Delete Architecture Project',
      message: 'Are you sure you want to delete this project? All generated specifications, diagrams, and files will be permanently removed.',
      confirmText: 'Delete Project',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      await dialog.alert({
        title: 'Deletion Failed',
        message: `Error deleting project: ${err.message}`,
        type: 'danger',
      });
    }
  };

  const handleClearAll = async () => {
    const confirmed = await dialog.confirm({
      title: 'Purge Architecture Catalog',
      message: 'Are you sure you want to delete all saved projects? This will permanently wipe your architecture history.',
      confirmText: 'Purge All Projects',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await clearAllProjects();
      setProjects([]);
    } catch (err: any) {
      await dialog.alert({
        title: 'Purge Failed',
        message: `Error clearing projects: ${err.message}`,
        type: 'danger',
      });
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.originalPrompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full h-full max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col font-sans space-y-6 min-h-0 overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div className="flex items-center space-x-3.5">
          <button
            type="button"
            onClick={handleNew}
            className="p-2.5 text-slate-400 hover:text-white rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.08] transition cursor-pointer text-xs flex items-center space-x-1.5 shrink-0"
            title="Back to Studio"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs font-medium">Studio</span>
          </button>
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400">
              <History className="w-4 h-4 text-blue-400" />
              <span>Project Registry</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 font-mono text-[11px]">{projects.length} Saved</span>
            </div>
            <h1 className="text-xl font-display font-bold text-white tracking-tight mt-0.5">
              Saved System Architectures
            </h1>
            <p className="text-xs text-slate-400">
              Browse, inspect, and export previously compiled engineering specifications.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          {projects.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={loading}
              className="px-3 py-2 text-xs text-rose-400 hover:text-rose-300 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-500/20 transition cursor-pointer flex items-center space-x-1.5 font-medium"
              title="Clear all saved projects"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Purge Registry</span>
            </button>
          )}
          <button
            type="button"
            onClick={loadHistory}
            disabled={loading}
            className="p-2.5 text-slate-400 hover:text-white rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.08] transition cursor-pointer text-xs"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleNew}
            className="px-4 py-2 rounded-xl btn-primary font-semibold text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-glow-sm"
          >
            <span>Compile New</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      {projects.length > 0 && (
        <div className="relative flex items-center w-full bg-[#0d131f]/70 border border-white/[0.08] focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/20 rounded-xl px-3.5 py-2.5 text-xs transition-all backdrop-blur-sm">
          <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved architectures by title, model, tech stack, or keywords..."
            className="flex-1 min-w-0 bg-transparent border-none text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none p-0"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="ml-2 text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 cursor-pointer text-xs flex items-center space-x-1 shrink-0 transition"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-400">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
          </div>
          <span className="text-xs font-medium">Retrieving architecture catalog...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center space-x-2">
          <X className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="py-20 text-center glass-card rounded-2xl border border-white/[0.08] p-8 space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400">
            <History className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-display font-bold text-white">
              {searchQuery ? 'No Matching Architectures' : 'No Architectures Compiled Yet'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? 'Try adjusting your search keywords or filter terms.'
                : 'Return to Studio and compile your first full 14-stage technical architecture specification.'}
            </p>
          </div>
          {!searchQuery && (
            <button
              type="button"
              onClick={handleNew}
              className="px-5 py-2.5 rounded-xl btn-primary font-semibold text-xs cursor-pointer shadow-glow-sm transition hover:scale-[1.02]"
            >
              Compile Architecture
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((p) => {
            const isCompleted = p.status === 'completed';
            const isRunning = p.status === 'running';

            return (
              <div
                key={p.id}
                onClick={() => onOpenProject(p.id)}
                className="glass-card hover:border-blue-500/40 hover:shadow-glow-sm hover:-translate-y-0.5 transition-all duration-200 rounded-xl p-5 cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.05] text-blue-300 border border-white/[0.08] font-mono text-[10px] font-medium">
                      {p.provider}
                    </span>
                    <span
                      className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isCompleted
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isRunning
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isCompleted
                            ? 'bg-emerald-400'
                            : isRunning
                            ? 'bg-sky-400 animate-ping'
                            : 'bg-rose-400'
                        }`}
                      />
                      <span>
                        {isCompleted
                          ? `${STAGE_DEFINITIONS.length}/${STAGE_DEFINITIONS.length} Ready`
                          : p.status.toUpperCase()}
                      </span>
                    </span>
                  </div>

                  <h3 className="text-sm font-display font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-2 leading-snug">
                    {p.title}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    "{p.originalPrompt}"
                  </p>
                </div>

                <div className="pt-3 border-t border-white/[0.06] space-y-2.5 text-xs text-slate-400">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center space-x-1.5 text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 truncate max-w-[130px] bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/[0.05]">
                      {p.model}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, p.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer text-xs"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center space-x-2">
                      {p.pdfUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadBlob(p.pdfUrl!, `archly-${toSafeSlug(p.title)}.pdf`);
                          }}
                          className="px-2 py-1 text-rose-300 hover:text-white text-[10px] font-semibold inline-flex items-center cursor-pointer bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-md transition"
                          title="Download PDF Specification"
                        >
                          PDF
                        </button>
                      )}
                      {p.zipUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadBlob(p.zipUrl!, `archly-${toSafeSlug(p.title)}.zip`);
                          }}
                          className="px-2 py-1 text-blue-300 hover:text-white text-[10px] font-semibold inline-flex items-center cursor-pointer bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-md transition"
                          title="Download Architecture Bundle (ZIP)"
                        >
                          ZIP
                        </button>
                      )}
                      <span className="text-xs font-semibold text-blue-400 group-hover:text-blue-300 group-hover:translate-x-0.5 transition-all flex items-center pl-1">
                        <span>Inspect</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-1" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HistoryView;
