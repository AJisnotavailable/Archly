import React, { useState } from 'react';
import {
  Folder,
  FileText,
  Download,
  Search,
  X,
  FileCode,
  Database,
  Shield,
  Network,
  Calendar,
  Layers,
  Terminal,
  Cpu,
  CheckCircle2,
} from 'lucide-react';
import { StageData, STAGE_DEFINITIONS } from '@archly/shared-types';
import { downloadBlob, downloadTextAsFile } from '../lib/api';

interface FileTreeProps {
  stages?: StageData[];
  stagesData?: Record<number, { contentMd?: string; status?: string }>;
  selectedStageNumber?: number;
  onSelectStage?: (num: number) => void;
  selectedFilename?: string;
  onSelectFile?: (stageNumber: number, filename: string) => void;
  projectId?: string;
  hasPdf?: boolean;
  onDownloadPdf?: () => void;
}

const getFileIcon = (filename: string) => {
  const lower = filename.toLowerCase();
  if (lower.includes('readme') || lower.includes('overview') || lower.includes('prd')) {
    return <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
  }
  if (lower.includes('flowchart') || lower.includes('architecture')) {
    return <Network className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
  }
  if (lower.includes('data') || lower.includes('erd') || lower.includes('database')) {
    return <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  }
  if (lower.includes('api') || lower.includes('endpoints')) {
    return <Terminal className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
  }
  if (lower.includes('security') || lower.includes('auth')) {
    return <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  }
  if (lower.includes('deploy') || lower.includes('docker') || lower.includes('infra')) {
    return <Cpu className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
  }
  if (lower.includes('roadmap') || lower.includes('gantt') || lower.includes('timeline')) {
    return <Calendar className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
  }
  return <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
};

export const FileTree: React.FC<FileTreeProps> = ({
  stages,
  stagesData = {},
  selectedStageNumber,
  onSelectStage,
  selectedFilename: propSelectedFilename,
  onSelectFile: propOnSelectFile,
  projectId,
  hasPdf = false,
  onDownloadPdf,
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  const onSelectFile = (stageNumber: number, filename: string) => {
    if (propOnSelectFile) {
      propOnSelectFile(stageNumber, filename);
    } else if (onSelectStage) {
      onSelectStage(stageNumber);
    }
  };

  const selectedDef = STAGE_DEFINITIONS.find((s) => s.stageNumber === selectedStageNumber);
  const selectedFilename = propSelectedFilename || selectedDef?.filename;

  // Sort files with 00_README at the top, then stage 1 onwards
  const sortedStages = [...STAGE_DEFINITIONS].sort((a, b) => {
    if (a.filename === '00_README.md') return -1;
    if (b.filename === '00_README.md') return 1;
    return a.stageNumber - b.stageNumber;
  });

  const filteredStages = sortedStages.filter(
    (s) =>
      s.filename.toLowerCase().includes(filterQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#0c101a]/90 rounded-2xl border border-white/[0.08] backdrop-blur-xl shadow-lg overflow-hidden font-sans">
      {/* Folder Header */}
      <div className="px-3.5 py-3 border-b border-white/[0.08] bg-[#090d16]/90 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center space-x-2.5 truncate">
          <Folder className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="text-xs font-bold text-white font-mono tracking-tight truncate">
            archly-spec/
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono px-2 py-0.5 rounded-full bg-white/[0.05]">
          {sortedStages.length} files
        </span>
      </div>

      {/* Filter Input */}
      <div className="p-2.5 border-b border-white/[0.06] bg-[#07090e]/60 shrink-0">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter specifications..."
            className="w-full bg-[#0a0e17] border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none transition-all"
          />
          {filterQuery && (
            <button
              type="button"
              onClick={() => setFilterQuery('')}
              className="absolute right-2 top-2 p-0.5 text-slate-500 hover:text-white rounded cursor-pointer transition-colors"
              title="Clear search filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Flat Document List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredStages.map((def) => {
          const stageState = stagesData[def.stageNumber];
          const isSelected = selectedFilename === def.filename;
          const isRunning = stageState?.status === 'running';
          const isCompleted = stageState?.status === 'completed';
          const isFailed = stageState?.status === 'failed';

          return (
            <button
              key={def.stageNumber}
              type="button"
              onClick={() => onSelectFile(def.stageNumber, def.filename)}
              className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer group ${
                isSelected
                  ? 'bg-blue-600/15 text-blue-200 font-semibold border border-blue-500/40 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.05] border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                {getFileIcon(def.filename)}
                <span className="text-[11px] font-mono truncate">{def.filename}</span>
              </div>

              {/* Status & Single File Download */}
              <div className="shrink-0 ml-1.5 flex items-center space-x-1.5">
                {isRunning && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                )}
                {isCompleted && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (projectId) {
                          downloadBlob(`/api/projects/${projectId}/download/file/${def.filename}`, def.filename);
                        } else if (stageState?.contentMd) {
                          downloadTextAsFile(stageState.contentMd, def.filename);
                        }
                      }}
                      className="p-1 rounded-md text-slate-500 hover:text-blue-300 hover:bg-white/10 transition cursor-pointer opacity-0 group-hover:opacity-100"
                      title={`Download ${def.filename}`}
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </>
                )}
                {isFailed && <span className="text-rose-400 text-xs font-bold">✖</span>}
              </div>
            </button>
          );
        })}

        {/* Master PDF in Tree */}
        {hasPdf && (
          <button
            type="button"
            onClick={onDownloadPdf}
            className="w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between text-rose-300 hover:text-rose-200 bg-rose-950/30 border border-rose-500/30 hover:border-rose-500/50 transition cursor-pointer mt-1.5 shadow-sm"
          >
            <div className="flex items-center space-x-2 truncate font-mono">
              <FileText className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="font-semibold truncate">archly-blueprint.pdf</span>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-900/50 text-rose-200 font-bold font-mono">
              PDF
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

