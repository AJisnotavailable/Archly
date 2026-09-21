import React from 'react';
import {
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Sparkles,
  FolderOpen,
  ChevronLeft,
  Pause,
  Play,
  SkipForward,
  Sliders,
} from 'lucide-react';
import { PipelineStepper } from './PipelineStepper';
import { MarkdownViewer } from './MarkdownViewer';
import { StageData, STAGE_DEFINITIONS, ProviderId } from '@archly/shared-types';

interface GeneratingViewProps {
  projectTitle: string;
  provider: string;
  model: string;
  currentRunningStage: number | null;
  selectedStageNumber: number;
  onSelectStage: (num: number) => void;
  stagesData: Record<number, Partial<StageData>>;
  activeStreamingContent: string;
  isComplete: boolean;
  onViewResults: () => void;
  onBackToHome?: () => void;
  pipelineError?: { stageNumber?: number; message: string } | null;
  onResumePipeline?: (override?: { provider?: ProviderId; model?: string; fromStage?: number }) => void;
  onPausePipeline?: () => void;
  onSkipStage?: () => void;
  onNavigateToSettings?: () => void;
  isPausing?: boolean;
  isSkipping?: boolean;
}

export const GeneratingView: React.FC<GeneratingViewProps> = ({
  projectTitle,
  provider,
  model,
  currentRunningStage,
  selectedStageNumber,
  onSelectStage,
  stagesData,
  activeStreamingContent,
  isComplete,
  onViewResults,
  onBackToHome,
  pipelineError,
  onResumePipeline,
  onPausePipeline,
  onSkipStage,
  onNavigateToSettings,
  isPausing,
  isSkipping,
}) => {
  const selectedDef = STAGE_DEFINITIONS.find((s) => s.stageNumber === selectedStageNumber);
  const selectedData = stagesData[selectedStageNumber];

  const isSelectedActive = currentRunningStage === selectedStageNumber;
  const displayContent = isSelectedActive
    ? activeStreamingContent || selectedData?.contentMd || 'Awaiting stream tokens...'
    : selectedData?.contentMd || (selectedData?.status === 'running' ? activeStreamingContent : 'Stage queued...');

  // Identify first paused, failed, or incomplete stage
  const pausedStageDef = STAGE_DEFINITIONS.find((s) => stagesData[s.stageNumber]?.status === 'paused');
  const failedStageDef = STAGE_DEFINITIONS.find((s) => stagesData[s.stageNumber]?.status === 'failed');
  const firstIncompleteDef = STAGE_DEFINITIONS.find(
    (s) => stagesData[s.stageNumber]?.status !== 'completed' && s.stageNumber >= 2
  );

  const isPipelineStopped = !isComplete && currentRunningStage === null;
  const isPaused = isPipelineStopped && !pipelineError;
  const effectiveStageToResume =
    pipelineError?.stageNumber ||
    pausedStageDef?.stageNumber ||
    failedStageDef?.stageNumber ||
    firstIncompleteDef?.stageNumber ||
    selectedStageNumber ||
    2;
  const effectiveStageDef = STAGE_DEFINITIONS.find((s) => s.stageNumber === effectiveStageToResume);

  return (
    <div className="w-full h-full max-w-7xl mx-auto px-3 sm:px-6 py-3 space-y-3 min-h-0 flex flex-col font-sans overflow-hidden">
      {/* Paused Alert Box */}
      {isPaused && (
        <div className="rounded-2xl border border-amber-500/40 bg-[#171109]/90 backdrop-blur-md p-4 space-y-3 shrink-0 shadow-[0_0_24px_rgba(245,158,11,0.12)]">
          <div className="flex items-start space-x-3.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 mt-0.5 shadow-sm">
              <Pause className="w-4 h-4 text-amber-400" />
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-amber-300 font-display tracking-tight">
                  Compilation Paused • Stage {effectiveStageToResume}
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-200 border border-amber-500/30 font-semibold font-mono">
                  {effectiveStageDef?.name || `Stage ${effectiveStageToResume}`}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  State Preserved
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Pipeline execution is paused. All architectural documents compiled up to this stage are securely stored in your local repository.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2.5 border-t border-amber-500/20 text-xs">
            {onResumePipeline && (
              <button
                type="button"
                onClick={() => onResumePipeline({ fromStage: effectiveStageToResume })}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-sm"
                title={`Resume compilation from Stage ${effectiveStageToResume}`}
              >
                <Play className="w-3.5 h-3.5 fill-white text-white" />
                <span>Resume Stage {effectiveStageToResume}</span>
              </button>
            )}

            {onSkipStage && (
              <button
                type="button"
                onClick={onSkipStage}
                disabled={isSkipping}
                className="px-3.5 py-1.5 rounded-xl bg-[#141a29] hover:bg-[#1d273d] text-blue-200 border border-blue-500/30 font-semibold text-xs flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
                title={`Skip Stage ${effectiveStageToResume} and proceed to next`}
              >
                <SkipForward className="w-3.5 h-3.5 text-blue-400" />
                <span>{isSkipping ? 'Skipping...' : `Skip Stage ${effectiveStageToResume}`}</span>
              </button>
            )}

            {onNavigateToSettings && (
              <button
                type="button"
                onClick={onNavigateToSettings}
                className="px-3 py-1.5 rounded-xl bg-[#090d16] border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-xs flex items-center space-x-1.5 transition cursor-pointer font-mono"
                title="Open Settings to check API keys or local endpoint"
              >
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Settings</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error Alert Box */}
      {pipelineError && (
        <div className="rounded-2xl border border-rose-500/40 bg-[#180a0e]/90 backdrop-blur-md p-4 space-y-3 shrink-0 shadow-[0_0_24px_rgba(244,63,94,0.12)]">
          <div className="flex items-start space-x-3.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0 mt-0.5 shadow-sm">
              <AlertCircle className="w-4 h-4 text-rose-400" />
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-rose-300 font-display tracking-tight">
                  {pipelineError.message?.includes('429') || pipelineError.message?.toLowerCase().includes('rate limit')
                    ? `Rate Limit Reached (HTTP 429)`
                    : pipelineError.message?.toLowerCase().includes('auth') || pipelineError.message?.includes('401')
                    ? `Authentication Error (Invalid API Key)`
                    : `Execution Halted • Stage ${pipelineError.stageNumber || effectiveStageToResume}`}
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-500/30 font-semibold font-mono">
                  {STAGE_DEFINITIONS.find((s) => s.stageNumber === (pipelineError.stageNumber || effectiveStageToResume))?.name || `Stage ${effectiveStageToResume}`}
                </span>
              </div>
              <div className="mt-1 p-2.5 rounded-xl bg-[#090d16] border border-rose-500/20 text-xs text-rose-200/90 font-mono leading-relaxed break-words">
                {pipelineError.message}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2.5 border-t border-rose-500/20 text-xs">
            {onResumePipeline && (
              <button
                type="button"
                onClick={() => onResumePipeline({ fromStage: pipelineError.stageNumber || effectiveStageToResume })}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-white text-white" />
                <span>Retry Stage</span>
              </button>
            )}

            {onSkipStage && (
              <button
                type="button"
                onClick={onSkipStage}
                disabled={isSkipping}
                className="px-3.5 py-1.5 rounded-xl bg-[#141a29] hover:bg-[#1d273d] text-blue-200 border border-blue-500/30 font-semibold text-xs flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <SkipForward className="w-3.5 h-3.5 text-blue-400" />
                <span>{isSkipping ? 'Skipping...' : 'Skip Stage'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                onResumePipeline?.({
                  fromStage: pipelineError.stageNumber || effectiveStageToResume,
                  provider: 'groq',
                  model: 'llama-3.3-70b-versatile',
                })
              }
              className="px-3.5 py-1.5 rounded-xl btn-primary font-semibold text-xs flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Switch to Groq LPU (Ultra-Fast)</span>
            </button>

            {onNavigateToSettings && (
              <button
                type="button"
                onClick={onNavigateToSettings}
                className="px-3 py-1.5 rounded-xl bg-[#090d16] border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-xs flex items-center space-x-1.5 transition cursor-pointer font-mono"
              >
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Settings</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Titlebar & Live Compilation Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0c101a]/90 border border-white/[0.08] backdrop-blur-xl shadow-lg shrink-0">
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

          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400 font-semibold uppercase text-[10px] font-mono">
                {provider} • {model}
              </span>
              <span className="text-white/20">•</span>
              {isComplete ? (
                <span className="text-emerald-400 font-bold flex items-center space-x-1 text-xs font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>COMPILATION COMPLETE</span>
                </span>
              ) : (
                <span className="text-cyan-400 font-semibold text-xs font-mono">
                  Stage {currentRunningStage || 2} of {STAGE_DEFINITIONS.length}
                </span>
              )}
            </div>
            <div className="text-sm font-bold text-white tracking-tight truncate font-display mt-0.5" title={projectTitle}>
              {projectTitle}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {!isComplete && (
            <>
              {currentRunningStage !== null ? (
                <button
                  type="button"
                  onClick={onPausePipeline}
                  disabled={isPausing}
                  className="px-3.5 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50 shadow-sm"
                  title="Pause pipeline execution immediately"
                >
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isPausing ? 'Pausing...' : 'Pause'}</span>
                </button>
              ) : onResumePipeline ? (
                <button
                  type="button"
                  onClick={() => onResumePipeline({ fromStage: effectiveStageToResume })}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer shadow-sm"
                  title="Resume pipeline generation"
                >
                  <Play className="w-3.5 h-3.5 text-white fill-white" />
                  <span>Resume</span>
                </button>
              ) : null}

              {onSkipStage && (
                <button
                  type="button"
                  onClick={onSkipStage}
                  disabled={isSkipping}
                  className="px-3.5 py-1.5 rounded-xl border border-white/10 bg-[#121826] hover:bg-[#1a2236] text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
                  title="Skip current stage and proceed to next stage"
                >
                  <SkipForward className="w-3.5 h-3.5 text-blue-400" />
                  <span>{isSkipping ? 'Skipping...' : 'Skip Stage'}</span>
                </button>
              )}
            </>
          )}

          {isComplete && (
            <button
              type="button"
              onClick={onViewResults}
              className="px-4 py-2 rounded-xl btn-primary font-semibold text-xs flex items-center space-x-2 transition cursor-pointer shrink-0 shadow-glow-md"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Open Architecture Viewer</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          )}
        </div>
      </div>

      {/* Split Pane: Stepper on left, Live Markdown stream on right */}
      <div className="flex-1 flex flex-col md:flex-row gap-3.5 min-h-0 overflow-hidden">
        {/* Left: Pipeline Stepper */}
        <div className="w-full md:w-72 lg:w-84 shrink-0 h-full min-h-0 bg-[#0c101a]/90 rounded-2xl border border-white/[0.08] backdrop-blur-xl p-3.5 flex flex-col overflow-hidden shadow-lg">
          <PipelineStepper
            currentRunningStage={currentRunningStage}
            stagesData={stagesData}
            selectedStageNumber={selectedStageNumber}
            onSelectStage={onSelectStage}
            isComplete={isComplete}
            onPausePipeline={onPausePipeline}
            onResumePipeline={onResumePipeline}
            onSkipStage={onSkipStage}
            isPausing={isPausing}
            isSkipping={isSkipping}
          />
        </div>

        {/* Right: Live Markdown Viewer */}
        <div className="flex-1 min-w-0 h-full min-h-0">
          <MarkdownViewer
            content={displayContent}
            filename={selectedDef?.filename}
            isStreaming={isSelectedActive}
          />
        </div>
      </div>
    </div>
  );
};

export default GeneratingView;
