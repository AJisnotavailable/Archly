import React, { useState, useEffect, useRef } from 'react';
import { ProviderId, ClarifyingQuestion, StageData, ProjectData } from '@archly/shared-types';
import { Header } from './components/Header';
import { HeroInput } from './components/HeroInput';

// Lazy-loaded secondary views to optimize initial bundle size & load performance
const ClarifyModal = React.lazy(() => import('./components/ClarifyModal').then((m) => ({ default: m.ClarifyModal })));
const GeneratingView = React.lazy(() => import('./components/GeneratingView').then((m) => ({ default: m.GeneratingView })));
const ResultsView = React.lazy(() => import('./components/ResultsView').then((m) => ({ default: m.ResultsView })));
const HistoryView = React.lazy(() => import('./components/HistoryView').then((m) => ({ default: m.HistoryView })));
const PromptLabView = React.lazy(() => import('./components/PromptLabView').then((m) => ({ default: m.PromptLabView })));
const SettingsView = React.lazy(() => import('./components/SettingsView').then((m) => ({ default: m.SettingsView })));

const ViewLoadingFallback: React.FC = () => (
  <div className="w-full h-full flex flex-col items-center justify-center p-8 select-none">
    <div className="flex items-center space-x-2 px-4 py-2 rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] font-mono text-xs shadow-lg">
      <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
      <span>INITIALIZING MODULE...</span>
    </div>
  </div>
);
import { useDialog } from './context/DialogContext';
import {
  createProject,
  submitAnswers,
  fetchProject,
  subscribeToPipelineStream,
  regenerateStage,
  pauseProjectPipeline,
  resumeProjectPipeline,
  skipProjectStage,
  downloadBlob,
  toSafeSlug,
  BASE_URL,
} from './lib/api';

const LOCAL_STORAGE_KEY_PREFIX = 'archly_key_';
const LEGACY_STORAGE_KEY_PREFIX = 'blueprintai_key_';

const getSavedKey = (provider: string): string => {
  return (
    localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${provider}`) ||
    localStorage.getItem(`${LEGACY_STORAGE_KEY_PREFIX}${provider}`) ||
    ''
  );
};

export const App: React.FC = () => {
  const dialog = useDialog();

  // Permanent Dark Matrix Phosphor Theme
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
  }, []);

  // Views
  const [currentView, setCurrentView] = useState<'hero' | 'generating' | 'results' | 'history' | 'prompt-lab' | 'settings'>('hero');
  const [showClarifyModal, setShowClarifyModal] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  // Form State
  const [prompt, setPrompt] = useState('');
  const [provider, setProvider] = useState<ProviderId>('groq');
  const [model, setModel] = useState('llama-3.3-70b-versatile');
  const [isLoading, setIsLoading] = useState(false);

  // BYOK API Keys stored in localStorage
  const [apiKeys, setApiKeys] = useState<Record<ProviderId, string>>(() => {
    return {
      openrouter: getSavedKey('openrouter'),
      groq: getSavedKey('groq'),
      nvidia_nim: getSavedKey('nvidia_nim'),
      local_llm: '',
      demo: '',
    };
  });

  // Local LLM Endpoint stored in localStorage
  const [localBaseUrl, setLocalBaseUrl] = useState<string>(() => {
    return (
      localStorage.getItem('archly_local_base_url') ||
      localStorage.getItem('blueprintai_local_base_url') ||
      'http://localhost:11434/v1'
    );
  });

  const handleSetLocalBaseUrl = (url: string) => {
    setLocalBaseUrl(url);
    localStorage.setItem('archly_local_base_url', url);
  };

  const handleSetApiKey = (p: ProviderId, key: string) => {
    setApiKeys((prev) => ({ ...prev, [p]: key }));
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${p}`, key);
  };

  // Prompt Lab custom prompt overrides
  const [customPrompts, setCustomPrompts] = useState<Record<number, string>>({});

  // Active Execution / Project State
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<ProjectData | null>(null);
  const [restatedIdea, setRestatedIdea] = useState('');
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);
  const [currentRunningStage, setCurrentRunningStage] = useState<number | null>(null);
  const [selectedStageNumber, setSelectedStageNumber] = useState<number>(2);
  const [stagesData, setStagesData] = useState<Record<number, Partial<StageData>>>({});
  const [activeStreamingContent, setActiveStreamingContent] = useState('');
  const [isPipelineComplete, setIsPipelineComplete] = useState(false);
  const [pipelineError, setPipelineError] = useState<{ stageNumber?: number; message: string } | null>(null);

  const cleanupStreamRef = useRef<(() => void) | null>(null);
  const streamBufferRef = useRef<string>('');
  const rafIdRef = useRef<number | null>(null);

  // Clean up any SSE stream on unmount
  useEffect(() => {
    // Proactively clean up any stray error elements created by Mermaid
    document.querySelectorAll('[id^="dmermaid"]').forEach((el) => el.remove());

    return () => {
      if (cleanupStreamRef.current) cleanupStreamRef.current();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Proactively clean up stray error elements whenever view or stage changes
  useEffect(() => {
    document.querySelectorAll('[id^="dmermaid"]').forEach((el) => el.remove());
  }, [currentView, selectedStageNumber]);

  // Handler: Start Stage 1 (Create Project)
  const handleStartProject = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);

    try {
      const resp = await createProject({
        prompt,
        provider,
        model,
        apiKey: apiKeys[provider] || undefined,
        baseUrl: provider === 'local_llm' ? localBaseUrl : undefined,
        customPrompts,
      });

      setActiveProjectId(resp.projectId);
      setRestatedIdea(resp.restatedIdea);
      setQuestions(resp.questions);
      setShowClarifyModal(true);
    } catch (err: any) {
      dialog.alert({
        title: 'Initialization Failed',
        message: err.message || 'Failed to start architecture session.',
        type: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Submit Answers and Trigger Full 14-stage Pipeline
  const handleSubmitClarifyingAnswers = async (answers: Record<string, string>) => {
    if (!activeProjectId) return;
    setIsLoading(true);

    try {
      await submitAnswers(activeProjectId, {
        answers,
        apiKey: apiKeys[provider] || undefined,
        baseUrl: provider === 'local_llm' ? localBaseUrl : undefined,
        customPrompts,
      });

      setShowClarifyModal(false);
      setCurrentView('generating');
      setIsPipelineComplete(false);
      setCurrentRunningStage(2);
      setSelectedStageNumber(2);
      setActiveStreamingContent('');

      // Build initial Stage 1 completed state so PipelineStepper immediately shows it as completed
      const initialStage1Json = JSON.stringify(
        {
          original_prompt: prompt,
          restated_idea: restatedIdea || prompt,
          clarifying_answers: answers,
          questions,
        },
        null,
        2
      );

      const initialStage1Md =
        `# Requirement Extraction & Clarification\n\n` +
        `**Original Idea:**\n${prompt}\n\n` +
        `**Restated Technical Vision:**\n${restatedIdea || prompt}\n\n` +
        `## Clarifying Questionnaire & Decisions\n\n` +
        questions
          .map((q, i) => {
            const ans = answers[q.id] || 'Standard / Default';
            return `### ${i + 1}. ${q.question}\n**Selected Decision:** \`${ans}\`\n`;
          })
          .join('\n') +
        `\n## Specification Document (\`00_clarifications.json\`)\n\n\`\`\`json\n` +
        initialStage1Json +
        `\n\`\`\`\n`;

      setStagesData({
        1: {
          stageNumber: 1,
          name: 'Requirement Extraction & Clarification',
          filename: '00_clarifications.json',
          contentMd: initialStage1Md,
          status: 'completed',
          durationMs: 1100,
          tokensUsed: 380,
        },
      });

      // Connect to live SSE stream
      startStreaming(activeProjectId);
    } catch (err: any) {
      dialog.alert({
        title: 'Execution Trigger Failed',
        message: err.message || 'Failed to trigger full pipeline execution.',
        type: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Connect SSE stream
  const startStreaming = (projectId: string) => {
    if (cleanupStreamRef.current) {
      cleanupStreamRef.current();
    }
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    streamBufferRef.current = '';

    const unsubscribe = subscribeToPipelineStream(projectId, {
      onStageStart: (payload) => {
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        streamBufferRef.current = '';
        setCurrentRunningStage(payload.stageNumber);
        setSelectedStageNumber(payload.stageNumber);
        setActiveStreamingContent('');
        setPipelineError(null);
        setStagesData((prev) => ({
          ...prev,
          [payload.stageNumber]: {
            stageNumber: payload.stageNumber,
            name: payload.name,
            filename: payload.filename,
            status: 'running',
            contentMd: '',
          },
        }));
      },
      onTokenDelta: (payload) => {
        streamBufferRef.current += payload.delta;
        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(() => {
            setActiveStreamingContent(streamBufferRef.current);
            rafIdRef.current = null;
          });
        }
      },
      onStageComplete: (payload) => {
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        streamBufferRef.current = '';
        setActiveStreamingContent('');
        setStagesData((prev) => ({
          ...prev,
          [payload.stageNumber]: {
            stageNumber: payload.stageNumber,
            name: payload.name,
            filename: payload.filename,
            contentMd: payload.contentMd,
            status: 'completed',
            tokensUsed: payload.tokensUsed,
            durationMs: payload.durationMs,
          },
        }));
      },
      onPipelineComplete: async () => {
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        streamBufferRef.current = '';
        setIsPipelineComplete(true);
        setCurrentRunningStage(null);
        setPipelineError(null);
        try {
          const freshProject = await fetchProject(projectId);
          setActiveProject(freshProject);
        } catch (e) {
          console.warn('Failed to load fresh project after pipeline complete:', e);
        }
      },
      onPipelinePaused: (payload) => {
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        setCurrentRunningStage(null);
        const stageNum = payload.stageNumber || currentRunningStage || selectedStageNumber;
        if (stageNum) {
          setStagesData((prev) => ({
            ...prev,
            [stageNum]: {
              ...(prev[stageNum] || {}),
              status: 'paused',
            },
          }));
        }
      },
      onError: (payload) => {
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        setPipelineError({
          stageNumber: payload.stageNumber,
          message: payload.error,
        });
        if (payload.stageNumber) {
          setStagesData((prev) => ({
            ...prev,
            [payload.stageNumber!]: {
              ...(prev[payload.stageNumber!] || {}),
              status: 'failed',
            },
          }));
        }
        setCurrentRunningStage(null);
      },
    });

    cleanupStreamRef.current = () => {
      unsubscribe();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  };

  // Handler: Pause running pipeline
  const handlePausePipeline = async () => {
    const targetProjectId = activeProjectId || activeProject?.id;
    if (!targetProjectId) return;
    setIsPausing(true);
    try {
      const activeStage = currentRunningStage || selectedStageNumber;
      if (activeStage) {
        setStagesData((prev) => ({
          ...prev,
          [activeStage]: {
            ...(prev[activeStage] || {}),
            status: 'paused',
            contentMd: prev[activeStage]?.contentMd || activeStreamingContent || '',
          },
        }));
      }
      setCurrentRunningStage(null);
      await pauseProjectPipeline(targetProjectId);
    } catch (err: any) {
      console.error('Failed to pause pipeline:', err);
    } finally {
      setIsPausing(false);
    }
  };

  // Helper to accurately locate which stage to resume from
  const getResumeTargetStage = (fromStageOverride?: number): number => {
    if (fromStageOverride && fromStageOverride >= 2 && fromStageOverride <= 14) {
      return fromStageOverride;
    }
    if (pipelineError?.stageNumber && pipelineError.stageNumber >= 2 && pipelineError.stageNumber <= 14) {
      return pipelineError.stageNumber;
    }
    // Scan stagesData for first paused or failed stage
    for (let s = 2; s <= 14; s++) {
      const st = stagesData[s];
      if (st && (st.status === 'paused' || st.status === 'failed')) {
        return s;
      }
    }
    // Scan stagesData for first incomplete stage
    for (let s = 2; s <= 14; s++) {
      const st = stagesData[s];
      if (!st || st.status !== 'completed') {
        return s;
      }
    }
    return 2;
  };

  // Handler: Resume Pipeline after Rate Limit, Pause, or Failure
  const handleResumePipeline = async (override?: { provider?: ProviderId; model?: string; fromStage?: number }) => {
    const targetProjectId = activeProjectId || activeProject?.id;
    if (!targetProjectId) return;

    try {
      setIsLoading(true);
      setPipelineError(null);

      const targetStage = getResumeTargetStage(override?.fromStage);
      const targetProvider = override?.provider || provider;
      const targetModel = override?.model || model;

      if (override?.provider) setProvider(override.provider);
      if (override?.model) setModel(override.model);

      setCurrentRunningStage(targetStage);
      setSelectedStageNumber(targetStage);
      setActiveStreamingContent('');

      setStagesData((prev) => ({
        ...prev,
        [targetStage]: {
          ...(prev[targetStage] || {}),
          status: 'running',
        },
      }));

      await resumeProjectPipeline(targetProjectId, {
        fromStage: targetStage,
        provider: targetProvider,
        model: targetModel,
        apiKey: apiKeys[targetProvider],
        baseUrl: targetProvider === 'local_llm' ? localBaseUrl : undefined,
        customPrompts,
      });

      startStreaming(targetProjectId);
      setCurrentView('generating');
    } catch (err: any) {
      setPipelineError({
        stageNumber: override?.fromStage || selectedStageNumber,
        message: err.message || 'Failed to resume pipeline',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Skip current or paused stage
  const handleSkipStage = async () => {
    const targetProjectId = activeProjectId || activeProject?.id;
    if (!targetProjectId) return;

    const stageToSkip = currentRunningStage || getResumeTargetStage();
    if (!stageToSkip || stageToSkip < 2 || stageToSkip > 14) return;

    setIsSkipping(true);
    setPipelineError(null);

    try {
      // Optimistically mark as completed in frontend UI immediately
      setStagesData((prev) => ({
        ...prev,
        [stageToSkip]: {
          ...(prev[stageToSkip] || {}),
          status: 'completed',
          contentMd: prev[stageToSkip]?.contentMd || `*(Stage ${stageToSkip} skipped by user)*`,
        },
      }));

      const result = await skipProjectStage(targetProjectId, stageToSkip);

      if (result.nextStage && result.nextStage <= 14) {
        setCurrentRunningStage(result.nextStage);
        setSelectedStageNumber(result.nextStage);
        setActiveStreamingContent('');
        // Ensure stream is connected for subsequent stages
        startStreaming(targetProjectId);
      } else {
        // Pipeline completed or reached end
        setCurrentRunningStage(null);
        setIsPipelineComplete(true);
      }
    } catch (err: any) {
      console.error('Failed to skip stage:', err);
      setPipelineError({
        stageNumber: stageToSkip,
        message: err.message || 'Failed to skip stage',
      });
    } finally {
      setIsSkipping(false);
    }
  };

  // Handler: Open Project from History
  const handleOpenProject = async (projectId: string) => {
    try {
      setIsLoading(true);
      const proj = await fetchProject(projectId);
      setActiveProjectId(proj.id);
      setActiveProject(proj);
      setPrompt(proj.originalPrompt);
      setProvider(proj.provider as ProviderId);
      setModel(proj.model);

      // Populate stages
      const stagesMap: Record<number, Partial<StageData>> = {};
      const stagesList = proj?.stages || [];
      stagesList.forEach((s) => {
        stagesMap[s.stageNumber] = s;
      });
      setStagesData(stagesMap);
      setIsPipelineComplete(proj?.status === 'completed');

      // Check if any stage failed previously
      const failedStage = stagesList.find((s: any) => s.status === 'failed');
      if (failedStage) {
        setPipelineError({
          stageNumber: failedStage.stageNumber,
          message: `Stage ${failedStage.stageNumber} was paused or failed previously. You can resume generation anytime.`,
        });
      } else {
        setPipelineError(null);
      }

      setCurrentView('results');
    } catch (err: any) {
      dialog.alert({
        title: 'Project Load Failed',
        message: `Failed to open project: ${err.message}`,
        type: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Regenerate Single Stage
  const handleRegenerateStage = async (stageNum: number, customPromptOverride?: string) => {
    if (!activeProjectId) return;
    try {
      await regenerateStage(
        activeProjectId,
        stageNum,
        apiKeys[provider] || undefined,
        customPromptOverride,
        provider === 'local_llm' ? localBaseUrl : undefined
      );

      // Listen to SSE updates for single stage
      startStreaming(activeProjectId);
      setCurrentView('generating');
      setCurrentRunningStage(stageNum);
      setSelectedStageNumber(stageNum);
    } catch (err: any) {
      dialog.alert({
        title: 'Stage Regeneration Failed',
        message: `Regeneration error: ${err.message}`,
        type: 'danger',
      });
    }
  };

  // Handler: Edit and Re-run (v2)
  const handleEditAndRerun = () => {
    setCurrentView('hero');
  };

  // Artifact downloads
  const handleDownloadZip = () => {
    if (!activeProjectId) return;
    const slug = toSafeSlug(activeProject?.title || 'blueprint');
    downloadBlob(`${BASE_URL}/api/projects/${activeProjectId}/download/zip`, `${slug}.zip`);
  };

  const handleDownloadPdf = () => {
    if (!activeProjectId) return;
    const slug = toSafeSlug(activeProject?.title || 'blueprint');
    downloadBlob(`${BASE_URL}/api/projects/${activeProjectId}/download/pdf`, `${slug}.pdf`);
  };

  return (
    <div className="h-screen w-screen overflow-hidden studio-canvas flex flex-col transition-colors duration-300 select-none">
      {/* Pinned Desktop Header */}
      <Header
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        activeProvider={provider}
        hasApiKey={!!apiKeys[provider]}
      />

      {/* Main Desktop Viewport Workspace */}
      <main className="flex-1 min-h-0 overflow-hidden relative flex flex-col">
        <React.Suspense fallback={<ViewLoadingFallback />}>
          {currentView === 'hero' && (
            <div className="w-full h-full min-h-0 p-2 sm:p-3 flex flex-col overflow-hidden">
              <HeroInput
                prompt={prompt}
                setPrompt={setPrompt}
                provider={provider}
                setProvider={setProvider}
                model={model}
                setModel={setModel}
                apiKeys={apiKeys}
                setApiKeyForProvider={handleSetApiKey}
                localBaseUrl={localBaseUrl}
                setLocalBaseUrl={handleSetLocalBaseUrl}
                onSubmit={handleStartProject}
                isLoading={isLoading}
                onNavigateToSettings={() => setCurrentView('settings')}
              />
            </div>
          )}

          {currentView === 'generating' && (
            <GeneratingView
              projectTitle={activeProject?.title || prompt.slice(0, 50)}
              provider={provider}
              model={model}
              currentRunningStage={currentRunningStage}
              selectedStageNumber={selectedStageNumber}
              onSelectStage={(num) => setSelectedStageNumber(num)}
              stagesData={stagesData}
              activeStreamingContent={activeStreamingContent}
              isComplete={isPipelineComplete}
              onViewResults={() => setCurrentView('results')}
              onBackToHome={() => setCurrentView('hero')}
              pipelineError={pipelineError}
              onResumePipeline={handleResumePipeline}
              onPausePipeline={handlePausePipeline}
              onSkipStage={handleSkipStage}
              isPausing={isPausing}
              isSkipping={isSkipping}
              onNavigateToSettings={() => setCurrentView('settings')}
            />
          )}

          {currentView === 'results' && activeProject && (
            <ResultsView
              project={activeProject}
              onDownloadZip={handleDownloadZip}
              onDownloadPdf={handleDownloadPdf}
              onRegenerateStage={handleRegenerateStage}
              onEditAndRerun={handleEditAndRerun}
              onBackToHome={() => setCurrentView('hero')}
            />
          )}

          {currentView === 'history' && (
            <div className="h-full overflow-y-auto">
              <HistoryView
                onOpenProject={handleOpenProject}
                onNewArchitecture={() => setCurrentView('hero')}
                onNewBlueprint={() => setCurrentView('hero')}
              />
            </div>
          )}

          {currentView === 'prompt-lab' && (
            <div className="h-full overflow-hidden">
              <PromptLabView
                customPrompts={customPrompts}
                onUpdatePrompt={(num, p) => setCustomPrompts((prev) => ({ ...prev, [num]: p }))}
                onResetPrompt={(num) =>
                  setCustomPrompts((prev) => {
                    const next = { ...prev };
                    delete next[num];
                    return next;
                  })
                }
                onResetAll={() => setCustomPrompts({})}
                onBackToStudio={() => setCurrentView('hero')}
              />
            </div>
          )}

          {currentView === 'settings' && (
            <div className="h-full overflow-y-auto">
              <SettingsView
                apiKeys={apiKeys}
                onSetApiKey={handleSetApiKey}
                localBaseUrl={localBaseUrl}
                onSetLocalBaseUrl={handleSetLocalBaseUrl}
                onBackToStudio={() => setCurrentView('hero')}
              />
            </div>
          )}
        </React.Suspense>
      </main>

      {/* Stage 1 Clarifications Modal */}
      {showClarifyModal && (
        <React.Suspense fallback={null}>
          <ClarifyModal
            restatedIdea={restatedIdea}
            questions={questions}
            onSubmitAnswers={handleSubmitClarifyingAnswers}
            onCancel={() => setShowClarifyModal(false)}
            isLoading={isLoading}
          />
        </React.Suspense>
      )}
    </div>
  );
};
export default App;
