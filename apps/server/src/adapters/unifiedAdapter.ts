import { ProviderId } from '@archly/shared-types';
import { config } from '../config';
import { generateDemoContent } from './demoProvider';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateParams {
  provider: ProviderId;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stageNumber?: number;
  stageContext?: Record<string, string>;
  originalPrompt?: string;
  abortSignal?: AbortSignal;
}

export async function* generate(params: GenerateParams): AsyncIterable<string> {
  const { provider, apiKey, model, messages, temperature = 0.7, maxTokens = 8192 } = params;

  // Handle Demo mode locally without external network call
  if (provider === 'demo' || (!apiKey && provider !== 'local_llm')) {
    const stageNum = params.stageNumber || 2;
    const prompt = params.originalPrompt || messages[messages.length - 1]?.content || 'Project';
    const content = generateDemoContent(stageNum, prompt, params.stageContext || {});

    // Stream out chunks with a slight delay to simulate natural LLM generation
    const chunkSize = 28;
    for (let i = 0; i < content.length; i += chunkSize) {
      if (params.abortSignal?.aborted) return;
      const chunk = content.slice(i, i + chunkSize);
      yield chunk;
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
    return;
  }

  // Real LLM provider call
  let baseUrl = config.providers.openrouter.baseUrl;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Archly/1.0',
  };

  if (provider === 'local_llm') {
    baseUrl = (params.baseUrl || config.providers.local_llm.baseUrl).replace(/\/+$/, '');
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
  } else if (provider === 'openrouter') {
    baseUrl = config.providers.openrouter.baseUrl;
    headers['Authorization'] = `Bearer ${apiKey}`;
    headers['HTTP-Referer'] = 'https://archly.local';
    headers['X-Title'] = 'Archly';
  } else if (provider === 'groq') {
    baseUrl = config.providers.groq.baseUrl;
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (provider === 'nvidia_nim') {
    baseUrl = config.providers.nvidia_nim.baseUrl;
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const endpoint = `${baseUrl}/chat/completions`;

  // Candidate models: primary chosen model, plus resilient fallbacks for OpenRouter free tier
  const modelsToAttempt: string[] = [model];
  if (provider === 'openrouter' && (model.endsWith(':free') || model.includes(':free') || model === 'openrouter/free')) {
    const fallbackList = [
      'openrouter/free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'meta-llama/llama-3.1-8b-instruct:free',
      'google/gemini-2.0-flash-exp:free',
      'qwen/qwen-2.5-coder-32b-instruct:free',
    ];
    for (const fb of fallbackList) {
      if (!modelsToAttempt.includes(fb)) {
        modelsToAttempt.push(fb);
      }
    }
  }

  let activeResponse: Response | null = null;
  let lastError: Error | null = null;

  for (let mIdx = 0; mIdx < modelsToAttempt.length; mIdx++) {
    if (params.abortSignal?.aborted) {
      const abortErr = new Error('Execution aborted by user');
      abortErr.name = 'AbortError';
      throw abortErr;
    }

    const currentModel = modelsToAttempt[mIdx];
    if (mIdx > 0) {
      console.warn(`[unifiedAdapter] Rate limit on previous model. Switching to fallback model: ${currentModel}`);
    }

    const maxRetries = 3;
    let streamEstablished = false;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (params.abortSignal?.aborted) {
        const abortErr = new Error('Execution aborted by user');
        abortErr.name = 'AbortError';
        throw abortErr;
      }

      const requestBody = {
        model: currentModel,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      };

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
          signal: params.abortSignal,
        });

        if (response.ok) {
          activeResponse = response;
          streamEstablished = true;
          break;
        }

        let errorDetail = '';
        try {
          const errJson = (await response.json()) as any;
          errorDetail = errJson.error?.message || errJson.message || JSON.stringify(errJson);
        } catch {
          errorDetail = await response.text();
        }

        if (response.status === 401) {
          throw new Error(`Authentication failed: Invalid ${provider.toUpperCase()} API key. Please check your key.`);
        } else if (response.status === 403) {
          throw new Error(`Access forbidden (403) for model ${currentModel}. Some models require registering access on ${provider}.`);
        } else if (response.status === 429 || response.status === 503 || response.status === 529) {
          // Rate limit or server temporarily overloaded - back off and retry
          const retryAfterHeader = response.headers.get('retry-after');
          let delayMs = 3000 * Math.pow(2, attempt); // 3s, 6s, 12s
          if (retryAfterHeader) {
            const parsedSec = parseInt(retryAfterHeader, 10);
            if (!isNaN(parsedSec) && parsedSec > 0 && parsedSec <= 30) {
              delayMs = parsedSec * 1000;
            }
          }

          if (attempt < maxRetries) {
            if (params.abortSignal?.aborted) {
              const abortErr = new Error('Execution aborted by user');
              abortErr.name = 'AbortError';
              throw abortErr;
            }
            console.warn(
              `[unifiedAdapter] Rate limit (${response.status}) on model ${currentModel} (${provider}). Retrying in ${Math.round(delayMs / 1000)}s (attempt ${attempt + 1}/${maxRetries})...`
            );
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
          } else {
            lastError = new Error(
              `Rate limit exceeded for model ${currentModel} on ${provider}. ${errorDetail || 'Please wait a moment or switch models.'}`
            );
            // Break from retries to try next fallback model if available
            break;
          }
        } else {
          throw new Error(`Provider error (${response.status}): ${errorDetail || response.statusText}`);
        }
      } catch (err: any) {
        if (params.abortSignal?.aborted || err.name === 'AbortError' || err.message?.toLowerCase().includes('abort')) {
          const abortErr = new Error('Execution aborted by user');
          abortErr.name = 'AbortError';
          throw abortErr;
        }
        if (err.message?.includes('Authentication failed') || err.message?.includes('Access forbidden')) {
          throw err;
        }
        if (provider === 'local_llm') {
          throw new Error(
            `Unable to connect to Local LLM at ${baseUrl}. Please ensure Ollama ('ollama serve') or LM Studio is active and listening. (${err.message})`
          );
        }
        lastError = err;
        if (attempt < maxRetries) {
          if (params.abortSignal?.aborted) {
            const abortErr = new Error('Execution aborted by user');
            abortErr.name = 'AbortError';
            throw abortErr;
          }
          const delayMs = 2500 * (attempt + 1);
          console.warn(`[unifiedAdapter] Provider connection issue for ${currentModel}: ${err.message}. Retrying in ${Math.round(delayMs / 1000)}s...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    if (streamEstablished && activeResponse) {
      break;
    }
  }

  if (!activeResponse || !activeResponse.ok) {
    throw (
      lastError ||
      new Error(`Rate limit exceeded for model ${model} on ${provider}. Please wait a moment or switch models.`)
    );
  }

  if (!activeResponse.body) {
    throw new Error('No response body received from provider stream');
  }

  const reader = activeResponse.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      if (params.abortSignal?.aborted) return;
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (trimmed === 'data: [DONE]') return;

        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              yield delta;
            }
          } catch {
            // Ignore incomplete JSON chunks
          }
        }
      }
    }

    // Flush any remaining buffer line
    if (buffer.trim().startsWith('data: ') && buffer.trim() !== 'data: [DONE]') {
      try {
        const parsed = JSON.parse(buffer.trim().slice(6));
        const delta = parsed.choices?.[0]?.delta?.content || '';
        if (delta) yield delta;
      } catch {}
    }
  } finally {
    reader.releaseLock();
  }
}

