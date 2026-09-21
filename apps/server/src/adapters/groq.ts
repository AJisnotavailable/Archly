import { AIModel } from '@archly/shared-types';
import { config } from '../config';

export async function fetchGroqModels(apiKey?: string): Promise<AIModel[]> {
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Archly/1.0',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const res = await fetch(`${config.providers.groq.baseUrl}/models`, {
      headers,
    });

    if (!res.ok) {
      throw new Error(`Groq models HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json() as { data: Array<{ id: string; context_window?: number; owned_by?: string }> };
    const rawList = json.data || [];

    // Filter text generation models (exclude whisper, guard models etc)
    const textModels = rawList.filter((m) => {
      const id = m.id.toLowerCase();
      return !id.includes('whisper') && !id.includes('guard') && !id.includes('vision');
    });

    return textModels.map((m) => {
      const id = m.id.toLowerCase();
      const tags: ('Fast' | 'Reasoning' | 'Long-context' | 'Coding' | 'Recommended')[] = [];

      if (id.includes('8b') || id.includes('instant') || id.includes('gemma')) {
        tags.push('Fast');
      }
      if (id.includes('70b') || id.includes('versatile') || id.includes('deepseek') || id.includes('qwq')) {
        tags.push('Reasoning');
      }
      if (id.includes('code') || id.includes('coder') || id.includes('qwen')) {
        tags.push('Coding');
      }
      if ((m.context_window || 0) >= 65536) {
        tags.push('Long-context');
      }
      if (id.includes('llama-3.3-70b-versatile') || id.includes('llama-3.1-8b-instant')) {
        tags.push('Recommended');
      }

      return {
        id: m.id,
        name: `Groq: ${m.id}`,
        provider: 'groq',
        contextLength: m.context_window || 8192,
        tags: tags.length > 0 ? tags : ['Fast'],
        isFree: true,
        description: `Ultra-fast inference on Groq LPUs with free developer rate limits.`,
        pricing: { prompt: 0, completion: 0 },
      };
    });
  } catch (err: any) {
    console.warn('Failed to fetch live Groq models, using standard Groq free catalog:', err.message);
    return [
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Groq: Llama 3.3 70B Versatile',
        provider: 'groq',
        contextLength: 128000,
        tags: ['Recommended', 'Reasoning', 'Long-context'],
        isFree: true,
        pricing: { prompt: 0, completion: 0 },
      },
      {
        id: 'llama-3.1-8b-instant',
        name: 'Groq: Llama 3.1 8B Instant (Blazing Fast)',
        provider: 'groq',
        contextLength: 128000,
        tags: ['Recommended', 'Fast', 'Long-context'],
        isFree: true,
        pricing: { prompt: 0, completion: 0 },
      },
      {
        id: 'deepseek-r1-distill-llama-70b',
        name: 'Groq: DeepSeek R1 Distill Llama 70B',
        provider: 'groq',
        contextLength: 128000,
        tags: ['Reasoning', 'Long-context'],
        isFree: true,
        pricing: { prompt: 0, completion: 0 },
      },
      {
        id: 'qwen-2.5-32b',
        name: 'Groq: Qwen 2.5 32B',
        provider: 'groq',
        contextLength: 128000,
        tags: ['Coding', 'Reasoning'],
        isFree: true,
        pricing: { prompt: 0, completion: 0 },
      },
    ];
  }
}
