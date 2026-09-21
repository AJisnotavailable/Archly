import React, { useState } from 'react';
import {
  HelpCircle,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  X,
  SkipForward,
} from 'lucide-react';
import { STAGE_DEFINITIONS } from '@archly/shared-types';

interface ClarifyQuestion {
  id: string;
  question: string;
  options: string[];
}

interface ClarifyModalProps {
  restatedIdea: string;
  questions: ClarifyQuestion[];
  onSubmitAnswers: (answers: Record<string, string>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const ClarifyModal: React.FC<ClarifyModalProps> = ({
  restatedIdea,
  questions,
  onSubmitAnswers,
  onCancel,
  isLoading,
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    questions.forEach((q) => {
      if (q.options && q.options.length > 0) {
        initial[q.id] = q.options[0];
      }
    });
    return initial;
  });

  const handleOptionChange = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleSmartDefaults = () => {
    const defaults: Record<string, string> = {};
    questions.forEach((q) => {
      defaults[q.id] = q.options?.[0] || 'Standard Architecture Profile';
    });
    setAnswers(defaults);
    onSubmitAnswers(defaults);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-200 font-sans">
      <div className="relative w-full max-w-3xl max-h-[90vh] glass-panel bg-[#090d16]/95 border border-white/[0.12] shadow-2xl rounded-2xl p-6 flex flex-col">
        {/* Titlebar */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-semibold text-blue-400 uppercase tracking-wider">
                Stage 01 Pre-Flight
              </span>
              <h2 className="text-base font-display font-bold text-white leading-tight">
                Architecture Scope Clarification
              </h2>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSmartDefaults}
              className="text-xs px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition flex items-center space-x-1.5 cursor-pointer font-medium"
              title="Skip stage 1 questions and proceed with standard defaults"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Use Defaults</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer text-xs transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Synthesized Concept Scope Box */}
        <div className="mt-4 p-3.5 rounded-xl bg-blue-500/[0.04] border border-blue-500/20 text-xs space-y-1 shrink-0 max-h-24 overflow-y-auto">
          <div className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold flex items-center space-x-1">
            <Sparkles className="w-3 h-3" />
            <span>Synthesized Concept Scope</span>
          </div>
          <p className="text-slate-200 leading-relaxed italic">
            "{restatedIdea}"
          </p>
        </div>

        {/* Questions List */}
        <div className="mt-4 space-y-3.5 flex-1 min-h-0 overflow-y-auto pr-1">
          {questions.map((q, idx) => (
            <div key={q.id} className="space-y-2.5 p-4 rounded-xl glass-card border border-white/[0.08]">
              <div className="flex items-start space-x-2.5">
                <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 shrink-0 mt-0.5">
                  Q{idx + 1}
                </span>
                <h3 className="text-xs font-semibold text-white leading-snug">
                  {q.question}
                </h3>
              </div>

              {/* Options Radio List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-7">
                {q.options.map((opt) => {
                  const isChecked = answers[q.id] === opt;
                  return (
                    <label
                      key={opt}
                      onClick={() => handleOptionChange(q.id, opt)}
                      className={`flex items-start space-x-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-blue-600/15 border-blue-500/60 text-white shadow-glow-sm'
                          : 'bg-white/[0.03] border-white/[0.07] text-slate-300 hover:border-white/[0.16] hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                            isChecked
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-slate-500 bg-transparent'
                          }`}
                        >
                          {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <span className="leading-tight text-[11px] select-none">
                        {opt}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Actions Footer */}
        <div className="mt-4 pt-3.5 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Targeting {STAGE_DEFINITIONS.length} production-grade architecture documents</span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleSmartDefaults}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-amber-500/40 text-amber-300 font-medium flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
              title="Skip questionnaire and start pipeline immediately"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Use Defaults</span>
            </button>

            <button
              type="button"
              onClick={() => onSubmitAnswers(answers)}
              disabled={isLoading}
              className="px-5 py-2 rounded-xl btn-primary font-semibold flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50 shadow-glow-sm hover:scale-[1.02]"
            >
              <span>Confirm & Compile ({STAGE_DEFINITIONS.length} Stages)</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
