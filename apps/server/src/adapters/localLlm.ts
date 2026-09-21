import { AIModel } from '@archly/shared-types';

const DEFAULT_LOCAL_MODELS: AIModel[] = [
  {
    id: 'llama3.2:latest',
    name: 'Llama 3.2 (Default)',
    provider: 'local_llm',
    contextLength: 128000,
    tags: ['Recommended', 'Fast'],
    isFree: true,
    description: 'Meta lightweight state-of-the-art local instruction model.',
  },
  {
    id: 'deepseek-r1:latest',
    name: 'DeepSeek R1 (Reasoning)',
    provider: 'local_llm',
    contextLength: 64000,
    tags: ['Reasoning', 'Recommended'],
    isFree: true,
    description: 'High-power local reasoning and deep architectural synthesis.',
  },
  {
    id: 'qwen2.5-coder:latest',
    name: 'Qwen 2.5 Coder',
    provider: 'local_llm',
    contextLength: 32768,
    tags: ['Coding', 'Recommended'],
    isFree: true,
    description: 'Top-tier code and technical architecture synthesis.',
  },
  {
    id: 'mistral:latest',
    name: 'Mistral 7B',
    provider: 'local_llm',
    contextLength: 32768,
    tags: ['Fast'],
    isFree: true,
    description: 'Fast, reliable general engineering instruction model.',
  },
];

export async function fetchLocalLlmModels(baseUrl = 'http://localhost:11434/v1'): Promise<AIModel[]> {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    // 1. Try standard OpenAI compatible /models endpoint (works for Ollama /v1, LM Studio, vLLM)
    const modelsEndpoint = `${normalizedBase}/models`;
    const response = await fetch(modelsEndpoint, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = (await response.json()) as any;
      const list = Array.isArray(data) ? data : data.data || [];

      if (list.length > 0) {
        return list.map((m: any) => {
          const rawId = typeof m === 'string' ? m : m.id || m.name || 'local-model';
          const tags: ('Fast' | 'Reasoning' | 'Long-context' | 'Coding' | 'Recommended')[] = ['Recommended'];
          if (/code|coder|dev/i.test(rawId)) tags.push('Coding');
          if (/r1|reason|think/i.test(rawId)) tags.push('Reasoning');
          if (/fast|mini|small|3\.2/i.test(rawId)) tags.push('Fast');

          return {
            id: rawId,
            name: `${rawId} [Local]`,
            provider: 'local_llm',
            tags,
            isFree: true,
            description: `Locally installed inference model on ${normalizedBase}`,
          };
        });
      }
    }
  } catch (err) {
    // Fallthrough to try native Ollama /api/tags if user specified root url
  }

  // 2. If user provided root Ollama URL without /v1 (e.g. http://localhost:11434)
  try {
    const rootUrl = normalizedBase.replace(/\/v1$/, '');
    const ollamaTagsUrl = `${rootUrl}/api/tags`;
    const ollamaController = new AbortController();
    const ollamaTimeout = setTimeout(() => ollamaController.abort(), 2000);

    const tagRes = await fetch(ollamaTagsUrl, { signal: ollamaController.signal });
    clearTimeout(ollamaTimeout);

    if (tagRes.ok) {
      const tagData = (await tagRes.json()) as any;
      if (tagData.models && Array.isArray(tagData.models) && tagData.models.length > 0) {
        return tagData.models.map((m: any) => {
          const rawId = m.name || m.model;
          const tags: ('Fast' | 'Reasoning' | 'Long-context' | 'Coding' | 'Recommended')[] = ['Recommended'];
          if (/code|coder|dev/i.test(rawId)) tags.push('Coding');
          if (/r1|reason|think/i.test(rawId)) tags.push('Reasoning');

          return {
            id: rawId,
            name: `${rawId} [Ollama]`,
            provider: 'local_llm',
            tags,
            isFree: true,
            description: `Ollama local model (${Math.round((m.size || 0) / (1024 * 1024 * 1024))}GB)`,
          };
        });
      }
    }
  } catch {
    // Fallback
  }

  // 3. Fallback: Return default recommended local models with an offline notice
  return DEFAULT_LOCAL_MODELS;
}
