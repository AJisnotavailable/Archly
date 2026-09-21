import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Pause,
  Play,
  SkipForward,
  Layers,
  RefreshCw,
  Clock,
  Coins,
} from 'lucide-react';
import { STAGE_DEFINITIONS, StageData } from '@archly/shared-types';

interface PipelineStepperProps {
  currentRunningStage: number | null;
  stagesData: Record<number, Partial<StageData>>;
  selectedStageNumber: number;
  onSelectStage: (stageNum: number) => void;
  isComplete: boolean;
  onPausePipeline?: () => void;
  onResumePipeline?: (override?: any) => void;
  onSkipStage?: () => void;
  isPausing?: boolean;
  isSkipping?: boolean;
}

export const PipelineStepper: React.FC<PipelineStepperProps> = ({
  currentRunningStage,
  stagesData,
  selectedStageNumber,
  onSelectStage,
  isComplete,
  onPausePipeline,
  onResumePipeline,
  onSkipStage,
  isPausing,
  isSkipping,
}) => {
  const totalStages = STAGE_DEFINITIONS.length;
  const completedCount = Object.values(stagesData).filter((s) => s.status === 'completed').length;
  const progressPercent = Math.round((completedCount / totalStages) * 100);

  const pausedStageDef =
    STAGE_DEFINITIONS.find((s) => stagesData[s.stageNumber]?.status === 'paused') ||
    STAGE_DEFINITIONS.find((s) => stagesData[s.stageNumber]?.status === 'failed') ||
    STAGE_DEFINITIONS.find((s) => stagesData[s.stageNumber]?.status !== 'completed' && s.stageNumber >= 2);
  const pausedStageNum = pausedStageDef?.stageNumber || 2;

  const isPaused =
    !isComplete &&
    currentRunningStage === null &&
    (completedCount > 0 || Object.values(stagesData).some((s) => s.status === 'paused' || s.status === 'failed'));

  return (
    <div className="flex flex-col h-full space-y-3 font-sans">
      {/* Pipeline Progress Card */}
      <div
        className={`p-3.5 rounded-xl bg-[#090d16] border space-y-3 shrink-0 transition-all ${
          isPaused
            ? 'border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
            : 'border-white/[0.08] shadow-md'
        }`}
      >
        {/* Top Bar: Title & Percentage */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-white font-semibold">
            <Layers className="w-4 h-4 text-blue-400" />
            <span className="font-display tracking-tight">Compilation Progress</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-bold text-blue-300 bg-blue-500/15 px-2.5 py-0.5 rounded-full border border-blue-500/30 font-mono shadow-sm">
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* Progress Bar Track */}
        <div className="space-y-1.5">
          <div className="relative w-full h-2 rounded-full bg-[#05070c] border border-white/10 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isPaused
                  ? 'bg-amber-400'
                  : 'bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]'
              }`}
              style={{ width: `${Math.max(progressPercent, currentRunningStage ? 7 : 0)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>
              {currentRunningStage
                ? `Stage ${currentRunningStage} of ${totalStages}`
                : isComplete
                ? `All ${totalStages} Stages Compiled`
                : `${completedCount} of ${totalStages} Complete`}
            </span>
            <span className="text-slate-500">{totalStages - completedCount} remaining</span>
          </div>
        </div>

        {/* Status & Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[11px]">
          <div className="flex items-center space-x-1.5 truncate mr-2">
            {isComplete ? (
              <span className="text-emerald-400 font-semibold flex items-center space-x-1.5 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Complete</span>
              </span>
            ) : currentRunningStage ? (
              <span className="text-cyan-400 font-semibold flex items-center space-x-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
                <span>Stage {currentRunningStage} Active</span>
              </span>
            ) : isPaused ? (
              <span className="text-amber-300 font-semibold flex items-center space-x-1.5 truncate">
                <Pause className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span>Paused (Stage {pausedStageNum})</span>
              </span>
            ) : (
              <span className="text-slate-400 font-mono">Idle</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1.5 shrink-0">
            {currentRunningStage !== null ? (
              <>
                <button
                  type="button"
                  onClick={onPausePipeline}
                  disabled={isPausing}
                  className="px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-semibold flex items-center space-x-1 transition cursor-pointer disabled:opacity-50"
                  title="Pause pipeline execution"
                >
                  <Pause className="w-3 h-3 text-amber-400" />
                  <span>{isPausing ? 'Pausing...' : 'Pause'}</span>
                </button>

                {onSkipStage && (
                  <button
                    type="button"
                    onClick={onSkipStage}
                    disabled={isSkipping}
                    className="px-2.5 py-1 rounded-lg border border-white/10 bg-[#121826] hover:bg-[#1a2236] text-slate-300 hover:text-white text-[10px] font-semibold flex items-center space-x-1 transition cursor-pointer disabled:opacity-50"
                    title="Skip current stage and proceed to next"
                  >
                    <SkipForward className="w-3 h-3 text-blue-400" />
                    <span>{isSkipping ? 'Skipping...' : 'Skip'}</span>
                  </button>
                )}
              </>
            ) : !isComplete ? (
              <>
                {onResumePipeline && (
                  <button
                    type="button"
                    onClick={() => onResumePipeline({ fromStage: pausedStageNum })}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold flex items-center space-x-1 transition cursor-pointer shadow-sm"
                    title={`Resume pipeline from Stage ${pausedStageNum}`}
                  >
                    <Play className="w-3 h-3 text-white fill-white" />
                    <span>Resume</span>
                  </button>
                )}

                {onSkipStage && (
                  <button
                    type="button"
                    onClick={onSkipStage}
                    disabled={isSkipping}
                    className="px-2.5 py-1 rounded-lg border border-white/10 bg-[#121826] hover:bg-[#1a2236] text-slate-300 hover:text-white text-[10px] font-semibold flex items-center space-x-1 transition cursor-pointer disabled:opacity-50"
                    title="Skip paused stage and proceed to next"
                  >
                    <SkipForward className="w-3 h-3 text-blue-400" />
                    <span>{isSkipping ? 'Skipping...' : 'Skip'}</span>
                  </button>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Stage List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {STAGE_DEFINITIONS.map((def) => (
          <StageRowItem
            key={def.stageNumber}
            def={def}
            stageState={stagesData[def.stageNumber]}
            isRunning={currentRunningStage === def.stageNumber}
            isSelected={selectedStageNumber === def.stageNumber}
            onSelectStage={onSelectStage}
          />
        ))}
      </div>
    </div>
  );
};

interface StageRowItemProps {
  def: (typeof STAGE_DEFINITIONS)[0];
  stageState?: Partial<StageData>;
  isRunning: boolean;
  isSelected: boolean;
  onSelectStage: (num: number) => void;
}

const StageRowItem = React.memo<StageRowItemProps>(
  ({ def, stageState, isRunning, isSelected, onSelectStage }) => {
    const isCompleted = stageState?.status === 'completed';
    const isPausedStage = stageState?.status === 'paused';
    const isFailed = stageState?.status === 'failed';
    const stageNumStr = String(def.stageNumber).padStart(2, '0');

    return (
      <button
        type="button"
        onClick={() => onSelectStage(def.stageNumber)}
        className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start space-x-3 cursor-pointer group ${
          isSelected
            ? 'bg-blue-600/15 border-blue-500/50 shadow-[0_0_16px_rgba(59,130,246,0.2)] text-white'
            : isRunning
            ? 'bg-[#101728] border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.15)] text-cyan-200'
            : isPausedStage
            ? 'bg-[#1c160e] border-amber-500/40 text-amber-200'
            : isCompleted
            ? 'bg-[#0b101c]/80 border-white/[0.06] hover:border-white/15 text-slate-300 hover:bg-[#121828]'
            : 'bg-transparent border-transparent opacity-40 hover:opacity-75 text-slate-400'
        }`}
      >
        {/* Status Indicator Icon */}
        <div className="mt-0.5 shrink-0">
          {isRunning ? (
            <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
          ) : isCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : isPausedStage ? (
            <Pause className="w-4 h-4 text-amber-400" />
          ) : isFailed ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : (
            <div className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
            </div>
          )}
        </div>

        {/* Stage Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="truncate tracking-tight font-sans">
              <span className="font-mono text-slate-400 font-normal mr-1">{stageNumStr}.</span> {def.name}
            </span>
            {isSelected && (
              <span className="text-[9px] text-blue-400 font-mono px-1.5 py-0.2 rounded bg-blue-500/10 border border-blue-500/30 shrink-0 ml-1 font-semibold">
                ACTIVE
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1 font-mono">
            <span className="truncate text-slate-500">{def.filename}</span>
            {stageState?.durationMs && (
              <span className="text-slate-400 flex items-center space-x-0.5 shrink-0">
                <Clock className="w-2.5 h-2.5 text-slate-500" />
                <span>{(stageState.durationMs / 1000).toFixed(1)}s</span>
              </span>
            )}
            {stageState?.tokensUsed && (
              <span className="text-slate-400 flex items-center space-x-0.5 shrink-0">
                <Coins className="w-2.5 h-2.5 text-slate-500" />
                <span>{stageState.tokensUsed}</span>
              </span>
            )}
          </div>
        </div>
      </button>
    );
  }
);

export default PipelineStepper;
