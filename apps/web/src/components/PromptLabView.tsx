import React, { useState } from 'react';
import {
  RotateCcw,
  ChevronLeft,
  Copy,
  Check,
  Layers,
  FileCode,
  Info,
  X,
  Sliders,
} from 'lucide-react';
import { STAGE_DEFINITIONS } from '@archly/shared-types';

interface PromptLabViewProps {
  customPrompts: Record<number, string>;
  onUpdatePrompt: (stageNumber: number, prompt: string) => void;
  onResetPrompt: (stageNumber: number) => void;
  onResetAll: () => void;
  onBackToStudio: () => void;
}

const STAGE_DESCRIPTIONS: Record<number, { desc: string; output: string }> = {
  1: {
    desc: 'Clarification questionnaire generation & requirement deconstruction.',
    output: '00_clarifications.json',
  },
  2: {
    desc: 'Executive summary, problem statement, key metrics, and competitive moat.',
    output: '01_research_and_discovery.md',
  },
  3: {
    desc: 'High-level topology, Mermaid C4/flowchart diagrams, protocols, and latency budgets.',
    output: '02_architecture.md',
  },
  4: {
    desc: 'Frontend, backend, database, cache, message broker, and telemetry stack selections with trade-offs.',
    output: '03_tech_stack.md',
  },
  5: {
    desc: 'Production schema definitions, Mermaid erDiagram, indexes, foreign keys, and migrations.',
    output: '04_database_schema.md',
  },
  6: {
    desc: 'RESTful/GraphQL endpoint definitions with request/response schemas, error codes, and rate limits.',
    output: '05_api_specification.md',
  },
  7: {
    desc: 'User sequences, Mermaid sequenceDiagram, stateDiagram-v2, and team branching workflows.',
    output: '06_workflow_and_user_flows.md',
  },
  8: {
    desc: 'Design system foundations, color tokens, typography scale, responsive layouts, and wireframes.',
    output: '07_ui_ux_design.md',
  },
  9: {
    desc: 'Complete production repository tree layout with directory purposes.',
    output: '08_folder_structure.md',
  },
  10: {
    desc: 'Phase-by-phase timeline with task checklists, Definition of Done, and Mermaid Gantt chart.',
    output: '09_roadmap.md',
  },
  11: {
    desc: 'Unit, integration, E2E test suites, load test thresholds, pre-launch QA checklists.',
    output: '10_testing_plan.md',
  },
  12: {
    desc: 'Environments, CI/CD pipeline, environment variable registry, rollback & monitoring setup.',
    output: '11_deployment_plan.md',
  },
  13: {
    desc: '8-point risk matrix spanning technical, market, legal, and operational risks.',
    output: '12_risk_register.md',
  },
  14: {
    desc: 'Master executive summary, table of contents, and 5-step quick start guide.',
    output: '00_README.md',
  },
};

export const PromptLabView: React.FC<PromptLabViewProps> = ({
  customPrompts,
  onUpdatePrompt,
  onResetPrompt,
  onResetAll,
  onBackToStudio,
}) => {
  const [selectedStage, setSelectedStage] = useState<number>(1);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  const totalStages = STAGE_DEFINITIONS.length;
  const customizedCount = Object.keys(customPrompts).filter((k) => customPrompts[Number(k)]?.trim()).length;

  const currentStageDef = STAGE_DEFINITIONS.find((s) => s.stageNumber === selectedStage);
  const currentStageInfo = STAGE_DESCRIPTIONS[selectedStage];
  const stageNumStr = String(selectedStage).padStart(2, '0');
  const currentCustomPrompt = customPrompts[selectedStage] || '';

  const insertVariable = (variable: string) => {
    const nextVal = currentCustomPrompt ? `${currentCustomPrompt}\n\n${variable}` : variable;
    onUpdatePrompt(selectedStage, nextVal);
    setCopiedVariable(variable);
    setTimeout(() => setCopiedVariable(null), 1500);
  };

  return (
    <div className="w-full h-full max-w-7xl mx-auto px-3 sm:px-6 py-4 flex flex-col font-sans space-y-4 min-h-0 overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl glass-panel bg-[#090d16]/80 border border-white/[0.08] shrink-0">
        <div className="flex items-center space-x-3.5 min-w-0">
          <button
            type="button"
            onClick={onBackToStudio}
            className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.08] text-slate-300 hover:text-white transition cursor-pointer flex items-center space-x-1 shrink-0 text-xs font-medium"
            title="Back to Studio"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Studio</span>
          </button>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center space-x-2 text-xs">
              <Sliders className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 font-semibold">
                Prompt Engineering Lab
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 text-xs font-mono">
                {customizedCount} of {totalStages} Stages Customized
              </span>
            </div>
            <h1 className="text-base font-display font-bold text-white truncate">
              Stage Prompt Templates & Directive Overrides
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          {customizedCount > 0 && (
            <button
              type="button"
              onClick={onResetAll}
              className="px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer"
              title="Reset all customized prompts"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All ({customizedCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onBackToStudio}
            className="px-4 py-1.5 rounded-xl btn-primary font-semibold text-xs transition cursor-pointer shadow-glow-sm"
          >
            <span>Done</span>
          </button>
        </div>
      </div>

      {/* Split View: Left Stages List, Right Editor */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4 overflow-hidden">
        {/* Left: Stage List */}
        <div className="w-full md:w-80 lg:w-88 shrink-0 h-full min-h-0 glass-card rounded-xl border border-white/[0.08] p-3 flex flex-col space-y-2.5 overflow-hidden">
          <div className="flex items-center justify-between px-1 pb-2 border-b border-white/[0.08] text-xs text-slate-400 font-medium shrink-0">
            <span className="flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Pipeline Stages</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold">
              {totalStages} STAGES
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
            {STAGE_DEFINITIONS.map((def) => {
              const isSelected = selectedStage === def.stageNumber;
              const isCustom = !!customPrompts[def.stageNumber]?.trim();
              const numStr = String(def.stageNumber).padStart(2, '0');

              return (
                <button
                  key={def.stageNumber}
                  type="button"
                  onClick={() => setSelectedStage(def.stageNumber)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start space-x-2.5 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/60 text-white shadow-glow-sm'
                      : 'bg-white/[0.03] border-white/[0.06] text-slate-300 hover:border-white/[0.14] hover:bg-white/[0.06]'
                  }`}
                >
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                      isSelected
                        ? 'bg-blue-500 text-white'
                        : isCustom
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-white/[0.06] text-slate-400 border border-white/[0.08]'
                    }`}
                  >
                    {numStr}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="truncate">{def.name}</span>
                      {isCustom && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 ml-1.5 shadow-[0_0_8px_rgba(251,191,36,0.8)]" title="Customized" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5 font-mono">
                      <span className="truncate text-[10px] text-slate-500">{def.filename}</span>
                      {isCustom && (
                        <span className="text-amber-400 font-bold text-[9px] shrink-0">
                          OVERRIDE
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Prompt Editor Pane */}
        <div className="flex-1 min-h-0 h-full glass-card rounded-xl border border-white/[0.08] p-4 sm:p-5 flex flex-col space-y-4 overflow-hidden">
          {/* Editor Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-white/[0.08] shrink-0">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center space-x-2 text-xs">
                <FileCode className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-sm font-display font-bold text-white truncate">
                  Stage {stageNumStr}: {currentStageDef?.name}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-300">
                  {currentStageInfo?.output}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {currentStageInfo?.desc}
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {currentCustomPrompt && (
                <>
                  <button
                    type="button"
                    onClick={() => onUpdatePrompt(selectedStage, '')}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:border-rose-500/50 hover:bg-rose-500/10 text-xs text-slate-400 hover:text-rose-300 flex items-center space-x-1 cursor-pointer transition"
                    title="Clear prompt text"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onResetPrompt(selectedStage)}
                    className="px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-xs text-amber-300 flex items-center space-x-1 cursor-pointer transition font-medium"
                    title="Revert back to system default prompt"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Revert to Default</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Context Variable Chips */}
          <div className="p-3.5 rounded-xl bg-[#090d16]/70 border border-white/[0.08] space-y-2.5 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center space-x-1.5">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                <span>Template Variables (click to insert):</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Leave empty to use Archly's optimized built-in prompt
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { var: '{{user_prompt}}', label: 'User raw idea' },
                { var: '{{restated_idea}}', label: 'Technical vision' },
                { var: '{{clarifying_answers}}', label: 'Clarification answers' },
                { var: '{{summary_of_stage_2}}', label: 'Research summary' },
                { var: '{{summary_of_stage_3}}', label: 'Architecture summary' },
                { var: '{{summary_all}}', label: 'All prior summaries' },
              ].map((item) => (
                <button
                  key={item.var}
                  type="button"
                  onClick={() => insertVariable(item.var)}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-blue-500/15 border border-white/[0.08] hover:border-blue-500/40 text-[11px] font-mono text-blue-300 flex items-center space-x-1.5 transition cursor-pointer hover:shadow-glow-sm"
                  title={`Insert ${item.var} (${item.label})`}
                >
                  {copiedVariable === item.var ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 opacity-60" />
                  )}
                  <span>{item.var}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Textarea Editor */}
          <div className="flex-1 min-h-0 flex flex-col relative rounded-xl border border-white/[0.08] focus-within:border-blue-500/70 focus-within:ring-2 focus-within:ring-blue-500/20 bg-[#090d16]/90 overflow-hidden transition-all">
            <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/[0.08] bg-white/[0.02] text-[11px] text-slate-400 shrink-0">
              <span className="font-semibold text-slate-300">
                Stage {stageNumStr} System Prompt Editor
              </span>
              <div className="flex items-center space-x-2 font-mono text-[10px]">
                <span className="bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">{currentCustomPrompt.length} chars</span>
                <span>•</span>
                <span className="bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">~{Math.ceil(currentCustomPrompt.length / 4)} tokens</span>
              </div>
            </div>

            <textarea
              value={currentCustomPrompt}
              onChange={(e) => onUpdatePrompt(selectedStage, e.target.value)}
              placeholder={`# Custom prompt instructions for Stage ${selectedStage}: ${currentStageDef?.name}...\n# Leave empty to utilize Archly's optimized built-in prompt.\n# Example:\n# Focus deeply on offline-first database schemas and high concurrency.`}
              className="w-full flex-1 p-4 bg-transparent font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none resize-none leading-relaxed overflow-y-auto"
              spellCheck={false}
            />
          </div>

          {/* Status Bar Footer */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-white/[0.08] shrink-0">
            <span className="text-[11px]">
              {currentCustomPrompt.trim()
                ? `Custom prompt override active for Stage ${stageNumStr}`
                : `Using default built-in prompt template for Stage ${stageNumStr}`}
            </span>
            <button
              type="button"
              onClick={onBackToStudio}
              className="text-xs text-blue-400 hover:text-blue-300 transition cursor-pointer font-medium"
            >
              Return to Studio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptLabView;
