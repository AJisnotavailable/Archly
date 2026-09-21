import {
  ProviderMetadata,
  AIModel,
  ProviderId,
  CreateProjectRequest,
  CreateProjectResponse,
  SubmitAnswersRequest,
  ProjectData,
  SSEStageStartPayload,
  SSETokenDeltaPayload,
  SSEStageCompletePayload,
  SSEPipelineCompletePayload,
  SSEErrorPayload,
} from '@archly/shared-types';
const isDesktop =
  typeof window !== 'undefined' &&
  (Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__) ||
    window.location.protocol === 'file:' ||
    window.location.hostname === 'tauri.localhost');

export const BASE_URL = isDesktop ? 'http://127.0.0.1:4000' : '';

async function fetchWithRetry(url: string, options?: RequestInit, retries = 4, delayMs = 600): Promise<Response> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err: any) {
      lastError = err;
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

export async function fetchProviders(): Promise<ProviderMetadata[]> {
  const res = await fetchWithRetry(`${BASE_URL}/api/providers`);
  if (!res.ok) throw new Error('Failed to load providers');
  return res.json();
}

export async function fetchModels(
  provider: ProviderId,
  apiKey?: string,
  refresh = false,
  baseUrl?: string
): Promise<AIModel[]> {
  const params = new URLSearchParams();
  if (apiKey) params.set('apiKey', apiKey);
  if (refresh) params.set('refresh', 'true');
  if (baseUrl) params.set('baseUrl', baseUrl);

  const url = `${BASE_URL}/api/providers/${provider}/models?${params.toString()}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch models for ${provider}`);
  }
  return res.json();
}

export async function createProject(data: CreateProjectRequest): Promise<CreateProjectResponse> {
  const res = await fetch(`${BASE_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to initialize project');
  }
  return res.json();
}

export async function submitAnswers(
  projectId: string,
  data: SubmitAnswersRequest
): Promise<{ status: string; projectId: string }> {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to submit clarifying answers');
  }
  return res.json();
}

export async function fetchProject(projectId: string): Promise<ProjectData> {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}`);
  if (!res.ok) throw new Error('Failed to fetch project');
  return res.json();
}

export async function fetchProjects(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/api/projects`);
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

export async function regenerateStage(
  projectId: string,
  stageNumber: number,
  apiKey?: string,
  customPrompt?: string,
  baseUrl?: string
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/stages/${stageNumber}/regenerate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, customPrompt, baseUrl }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to regenerate stage ${stageNumber}`);
  }
}

export async function deleteProject(projectId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete project');
}

export async function clearAllProjects(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/projects`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to clear project history');
}

export async function pauseProjectPipeline(projectId: string): Promise<{ status: string; projectId: string }> {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to pause pipeline');
  }
  return res.json();
}

export async function skipProjectStage(
  projectId: string,
  stageNumber?: number
): Promise<{ status: string; skippedStage: number; nextStage?: number }> {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/skip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stageNumber }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to skip stage');
  }
  return res.json();
}

export async function resumeProjectPipeline(
  projectId: string,
  options?: {
    fromStage?: number;
    provider?: ProviderId;
    model?: string;
    apiKey?: string;
    baseUrl?: string;
    customPrompts?: Record<number, string>;
  }
): Promise<{ status: string; projectId: string; fromStage?: number; provider?: string; model?: string }> {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options || {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to resume pipeline');
  }
  return res.json();
}

// Helper to generate clean, short, valid filename slugs
export function toSafeSlug(title: string, maxLength = 32): string {
  const clean = (title || 'archly')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/, '');
  return clean || 'archly';
}

export async function downloadBlob(url: string, defaultFilename = 'download'): Promise<void> {
  const finalUrl =
    url.startsWith('/') && BASE_URL
      ? `${BASE_URL}${url}`
      : url.startsWith('/')
      ? `http://localhost:4000${url}`
      : url;

  if (isDesktop) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const res = await fetch(finalUrl);
      if (!res.ok) {
        throw new Error(`Failed to download file: Server returned status ${res.status}`);
      }
      const arrayBuffer = await res.arrayBuffer();
      const bytes = Array.from(new Uint8Array(arrayBuffer));
      const savedPath = await invoke<string | null>('save_file_with_dialog', {
        defaultFilename,
        bytes,
      });
      if (savedPath) {
        console.log(`[Archly] File saved to: ${savedPath}`);
      }
      return;
    } catch (err) {
      console.warn('Desktop native save failed or was cancelled, attempting fallback:', err);
    }
  }

  // Browser fallback
  const link = document.createElement('a');
  link.href = finalUrl;
  if (defaultFilename) {
    link.download = defaultFilename;
  }
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (document.body.contains(link)) document.body.removeChild(link);
  }, 1000);
}

export async function downloadTextAsFile(content: string, filename: string, asPlainText = false): Promise<void> {
  const finalFilename = asPlainText ? filename.replace(/\.md$/i, '.txt') : filename;

  if (isDesktop) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const savedPath = await invoke<string | null>('save_text_file_with_dialog', {
        defaultFilename: finalFilename,
        content,
      });
      if (savedPath) {
        console.log(`[Archly] Text file saved to: ${savedPath}`);
      }
      return;
    } catch (err) {
      console.warn('Desktop native text save failed or was cancelled, attempting fallback:', err);
    }
  }

  // Browser fallback
  const mimeType = asPlainText ? 'text/plain;charset=utf-8' : 'application/octet-stream';
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = finalFilename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (document.body.contains(link)) document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  }, 2000);
}

export interface StreamHandlers {
  onStageStart?: (payload: SSEStageStartPayload) => void;
  onTokenDelta?: (payload: SSETokenDeltaPayload) => void;
  onStageComplete?: (payload: SSEStageCompletePayload) => void;
  onPipelineComplete?: (payload: SSEPipelineCompletePayload) => void;
  onPipelinePaused?: (payload: { projectId: string; stageNumber?: number }) => void;
  onError?: (payload: SSEErrorPayload) => void;
}

export function subscribeToPipelineStream(
  projectId: string,
  handlers: StreamHandlers
): () => void {
  const eventSource = new EventSource(`${BASE_URL}/api/projects/${projectId}/stream`);

  eventSource.addEventListener('stage_start', (e) => {
    try {
      const data = JSON.parse(e.data);
      handlers.onStageStart?.(data);
    } catch {}
  });

  eventSource.addEventListener('token_delta', (e) => {
    try {
      const data = JSON.parse(e.data);
      handlers.onTokenDelta?.(data);
    } catch {}
  });

  eventSource.addEventListener('stage_complete', (e) => {
    try {
      const data = JSON.parse(e.data);
      handlers.onStageComplete?.(data);
    } catch {}
  });

  eventSource.addEventListener('pipeline_complete', (e) => {
    try {
      const data = JSON.parse(e.data);
      handlers.onPipelineComplete?.(data);
    } catch {}
  });

  eventSource.addEventListener('pipeline_paused', (e) => {
    try {
      const data = JSON.parse(e.data);
      handlers.onPipelinePaused?.(data);
    } catch {}
  });

  eventSource.addEventListener('error', (e: any) => {
    if (e.data) {
      try {
        const data = JSON.parse(e.data);
        handlers.onError?.(data);
      } catch {
        handlers.onError?.({ error: 'SSE Stream Error' });
      }
    }
  });

  return () => {
    eventSource.close();
  };
}

export async function openExternalUrl(url: string): Promise<void> {
  if (isDesktop) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_external_url', { url });
      return;
    } catch (err) {
      console.warn('Tauri open_external_url invocation failed, using fallback:', err);
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
