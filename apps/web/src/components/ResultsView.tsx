import React, { useState } from 'react';
import {
  Download,
  FileText,
  Globe,
  RotateCcw,
  Edit3,
  ChevronLeft,
  Printer,
  X,
  CheckCircle2,
} from 'lucide-react';
import { FileTree } from './FileTree';
import { MarkdownViewer } from './MarkdownViewer';
import { ProjectData, StageData, STAGE_DEFINITIONS } from '@archly/shared-types';
import { downloadBlob, toSafeSlug } from '../lib/api';

interface ResultsViewProps {
  project: ProjectData;
  onDownloadZip: () => void;
  onDownloadPdf: () => void;
  onRegenerateStage?: (stageNumber: number, customPrompt?: string) => void;
  onEditAndRerun?: () => void;
  onBackToHome?: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  project,
  onDownloadZip,
  onDownloadPdf,
  onRegenerateStage,
  onEditAndRerun,
  onBackToHome,
}) => {
  const [selectedStageNumber, setSelectedStageNumber] = useState<number>(14);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [customRegenPrompt, setCustomRegenPrompt] = useState('');
  const [printScope, setPrintScope] = useState<'current' | 'all'>('current');

  const selectedDef = STAGE_DEFINITIONS.find((s) => s.stageNumber === selectedStageNumber);
  const selectedStage = project.stages.find((s: StageData) => s.stageNumber === selectedStageNumber);

  const cleanSlug = toSafeSlug(project?.title || 'project');

  const handleConfirmRegenerate = () => {
    if (onRegenerateStage) {
      onRegenerateStage(selectedStageNumber, customRegenPrompt.trim() || undefined);
      setShowRegenModal(false);
      setCustomRegenPrompt('');
    }
  };

  const handlePrintDocument = () => {
    window.print();
  };

  return (
    <div className="w-full h-full max-w-7xl mx-auto px-3 sm:px-6 py-3 space-y-3 min-h-0 flex flex-col font-sans overflow-hidden">
      {/* Top Header & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-[#0c101a]/90 border border-white/[0.08] backdrop-blur-xl shadow-lg shrink-0 no-print">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-[#121826] border border-white/[0.08] hover:border-white/20 transition cursor-pointer text-xs flex items-center space-x-1.5 shrink-0 shadow-sm"
              title="Back to Studio"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-medium">Back</span>
            </button>
          )}
          <div className="min-w-0 space-y-0.5 flex-1">
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-emerald-400 font-semibold flex items-center space-x-1 shrink-0 font-mono text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>COMPILED</span>
              </span>
              <span className="text-white/20">•</span>
              <span className="text-slate-400 truncate font-mono text-[11px]">
                {project.provider.toUpperCase()} • {project.model}
              </span>
            </div>
            <div className="text-sm font-bold text-white tracking-tight truncate font-display" title={project.title}>
              {project.title}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Studio Actions */}
          <div className="flex items-center space-x-1 bg-[#090d16] p-1 rounded-xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setShowRegenModal(true)}
              className="px-3 py-1.5 rounded-lg hover:bg-white/[0.06] text-slate-300 hover:text-cyan-300 text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer"
              title="Re-run this section with optional custom instructions"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Regenerate</span>
            </button>

            <button
              type="button"
              onClick={onEditAndRerun}
              className="px-3 py-1.5 rounded-lg hover:bg-white/[0.06] text-slate-300 hover:text-amber-300 text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer"
              title="Edit original concept to launch a fork"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Fork Project</span>
            </button>
          </div>

          {/* Export Suite */}
          <div className="flex items-center space-x-1 bg-[#090d16] p-1 rounded-xl border border-white/[0.08]">
            {/* Live Vector Print with Scope Selector */}
            <div className="flex items-center rounded-lg bg-blue-600/15 border border-blue-500/30 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={handlePrintDocument}
                className="px-2.5 py-1 text-blue-300 hover:bg-blue-600/25 text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer"
                title={`Print ${printScope === 'all' ? 'All Stages' : 'Current Stage'} to vector PDF (Ctrl+P)`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print PDF</span>
              </button>
              <select
                value={printScope}
                onChange={(e) => setPrintScope(e.target.value as 'current' | 'all')}
                className="bg-[#0b1220] text-cyan-300 text-[10px] font-mono px-1.5 py-1 border-l border-blue-500/30 outline-none cursor-pointer"
                title="Select print scope: Current document or All stages"
              >
                <option value="current">Current</option>
                <option value="all">All Stages</option>
              </select>
            </div>

            {/* Download HTML */}
            <button
              type="button"
              onClick={() => downloadBlob(`/api/projects/${project.id}/download/html`, `archly-${cleanSlug}.html`)}
              className="px-2.5 py-1 rounded-lg hover:bg-white/[0.06] text-cyan-400 text-xs font-semibold transition flex items-center space-x-1 cursor-pointer"
              title="Download standalone interactive HTML report (.html)"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>HTML</span>
            </button>

            {/* Download Server PDF */}
            <button
              type="button"
              onClick={() => downloadBlob(`/api/projects/${project.id}/download/pdf`, `archly-${cleanSlug}.pdf`)}
              className="px-2.5 py-1 rounded-lg hover:bg-white/[0.06] text-pink-400 text-xs font-semibold transition flex items-center space-x-1 cursor-pointer"
              title="Download compiled vector PDF package (.pdf)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            {/* Download ZIP */}
            <button
              type="button"
              onClick={() => downloadBlob(`/api/projects/${project.id}/download/zip`, `archly-${cleanSlug}.zip`)}
              className="px-3 py-1.5 rounded-lg btn-primary text-xs font-semibold font-sans transition flex items-center space-x-1.5 cursor-pointer shadow-glow-sm"
              title="Download complete archive as ZIP (.zip)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ZIP Archive</span>
            </button>
          </div>
        </div>
      </div>

      {/* Split Pane: File Tree on left, Markdown on right */}
      <div className={`flex-1 flex flex-col md:flex-row gap-3.5 min-h-0 overflow-hidden ${printScope === 'all' ? 'print:hidden' : ''}`}>
        {/* Left File Tree Navigation */}
        <div className="w-full md:w-72 lg:w-80 shrink-0 h-full min-h-0 no-print">
          <FileTree
            stages={project.stages}
            selectedStageNumber={selectedStageNumber}
            onSelectStage={setSelectedStageNumber}
          />
        </div>

        {/* Right Stage Viewer */}
        <div className="flex-1 min-w-0 h-full min-h-0">
          <MarkdownViewer
            projectId={project.id}
            content={selectedStage?.contentMd || '# No content available for this section'}
            filename={selectedDef?.filename}
          />
        </div>
      </div>

      {/* Multi-Stage Print Blueprint (Active only when printScope === 'all' during print) */}
      {printScope === 'all' && (
        <div className="hidden print:block space-y-8 print-blueprint-wrapper">
          <div className="p-6 border-b-2 border-[#1b2333] mb-8">
            <div className="text-xs font-bold text-[#3b82f6] uppercase tracking-widest mb-1">
              Archly System Architecture Specification
            </div>
            <h1 className="text-3xl font-bold text-[#f8fafc] mb-2">{project.title}</h1>
            {project.restatedIdea && (
              <p className="text-sm text-[#cbd5e1] leading-relaxed mb-4">{project.restatedIdea}</p>
            )}
            <div className="text-xs text-[#64748b] flex items-center gap-4">
              <span>Engine: {project.provider.toUpperCase()} ({project.model})</span>
              <span>•</span>
              <span>Volume: {project.stages.length} Documents</span>
              <span>•</span>
              <span>Date: {new Date(project.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {project.stages
            .slice()
            .sort((a, b) => a.stageNumber - b.stageNumber)
            .map((st) => (
              <div key={st.id} className="print-page-break mb-10">
                <div className="bg-[#090c13] border border-[#1b2333] p-2.5 rounded mb-3 flex items-center justify-between text-xs">
                  <span className="font-bold text-[#3b82f6]">FILE: {st.filename} [STAGE {String(st.stageNumber).padStart(2, '0')}]</span>
                  <span className="text-[#38bdf8] font-bold">{st.name}</span>
                </div>
                <MarkdownViewer
                  projectId={project.id}
                  content={st.contentMd}
                  filename={st.filename}
                />
              </div>
            ))}
        </div>
      )}

      {/* Section Regeneration Modal */}
      {showRegenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 font-sans">
          <div className="relative w-full max-w-lg bg-[#0c101a] rounded-2xl p-6 border border-white/15 shadow-2xl space-y-4">
            <div className="space-y-1">
              <div className="text-base font-bold text-white flex items-center space-x-2 font-display">
                <RotateCcw className="w-4 h-4 text-cyan-400" />
                <span>Regenerate Stage {selectedStageNumber}: {selectedDef?.name}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Re-compiles document "{selectedDef?.filename}" incorporating updated instructions with all upstream architecture context.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 block">
                  Custom Stage Directives (Optional)
                </label>
                {customRegenPrompt && (
                  <button
                    type="button"
                    onClick={() => setCustomRegenPrompt('')}
                    className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center space-x-1 cursor-pointer"
                    title="Clear instructions"
                  >
                    <X className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
              <textarea
                value={customRegenPrompt}
                onChange={(e) => setCustomRegenPrompt(e.target.value)}
                placeholder="Specify specific requirements (e.g. 'Focus on PostgreSQL with TimescaleDB extensions, read replicas, and high concurrency benchmarks')..."
                rows={3}
                className="w-full bg-[#07090e] border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl p-3 text-xs text-slate-100 font-mono focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setShowRegenModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer flex items-center space-x-1 rounded-xl bg-[#121826] border border-white/10 hover:border-white/20 shadow-sm"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRegenModal(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRegenerate}
                  className="px-4 py-2 rounded-xl btn-primary font-bold text-xs transition cursor-pointer shadow-glow-sm"
                >
                  Execute Regeneration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsView;
