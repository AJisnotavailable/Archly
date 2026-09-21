import { AIModel } from '@archly/shared-types';
import { config } from '../config';

export async function fetchOpenRouterModels(): Promise<AIModel[]> {
  try {
    const res = await fetch(`${config.providers.openrouter.baseUrl}/models`, {
      headers: {
        'User-Agent': 'Archly/1.0',
        'HTTP-Referer': 'https://archly.local',
        'X-Title': 'Archly',
      },
    });

    if (!res.ok) {
      throw new Error(`OpenRouter models HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json() as { data: Array<{ id: string; name?: string; context_length?: number; pricing?: { prompt?: string; completion?: string }; description?: string }> };
    
    // Filter free models: pricing prompt == "0" and completion == "0" or id ends with :free
    const freeRaw = (data.data || []).filter((m) => {
      const isPricingZero = m.pricing?.prompt === '0' && m.pricing?.completion === '0';
      const isFreeSuffix = m.id?.toLowerCase().endsWith(':free');
      return isPricingZero || isFreeSuffix;
    });

    const mappedModels: AIModel[] = freeRaw.map((m) => {
      const tags: ('Fast' | 'Reasoning' | 'Long-context' | 'Coding' | 'Recommended')[] = [];
      const idLower = m.id.toLowerCase();

      if (idLower.includes('llama-3.3') || idLower.includes('qwen-2.5-72b') || idLower.includes('deepseek')) {
        tags.push('Reasoning');
      }
      if (idLower.includes('coder') || idLower.includes('code') || idLower.includes('dev')) {
        tags.push('Coding');
      }
      if (idLower.includes('flash') || idLower.includes('8b') || idLower.includes('mini')) {
        tags.push('Fast');
      }
      if ((m.context_length || 0) >= 32768) {
        tags.push('Long-context');
      }

      return {
        id: m.id,
        name: m.name || m.id,
        provider: 'openrouter',
        contextLength: m.context_length || 8192,
        tags: tags.length > 0 ? tags : ['Fast'],
        isFree: true,
        description: m.description,
        pricing: { prompt: 0, completion: 0 },
      };
    });

    // Curated OpenRouter free models
    const results: AIModel[] = [
      {
        id: 'openrouter/free',
        name: 'OpenRouter Free Auto-Router',
        provider: 'openrouter',
        contextLength: 32768,
        tags: ['Fast'],
        isFree: true,
        description: 'Automatically routes to the highest-availability capable free model at request time.',
        pricing: { prompt: 0, completion: 0 },
      },
      ...mappedModels,
    ];

    return results;
  } catch (err: any) {
    console.warn('Failed to fetch live OpenRouter models, using reliable curated free catalog:', err.message);
    return [
      {
        id: 'openrouter/free',
        name: 'OpenRouter Free Auto-Router',
        provider: 'openrouter',
        contextLength: 32768,
        tags: ['Fast'],
        isFree: true,
        pricing: { prompt: 0, completion: 0 },
      },
      {
        id: 'meta-llama/llama-3.3-70b-instruct:free',
        name: 'Meta Llama 3.3 70B Instruct (Free)',
        provider: 'openrouter',
        contextLength: 131072,
        tags: ['Reasoning', 'Long-context'],
        isFree: true,
        pricing: { prompt: 0, completion: 0 },
      },
      {
        id: 'meta-llama/llama-3.1-8b-instruct:free',
        name: 'Meta Llama 3.1 8B Instruct (Free)',
        provider: 'openrouter',
        contextLength: 131072,
        tags: ['Fast', 'Long-context'],
        isFree: true,
        pricing: { prompt: 0, completion: 0 },
      },
      {
        id: 'qwen/qwen-2.5-coder-32b-instruct:free',
        name: 'Qwen 2.5 Coder 32B Instruct (Free)',
        provider: 'openrouter',
        contextLength: 32768,
        tags: ['Coding', 'Reasoning'],
        isFree: true,
        pricing: { prompt: 0, completion: 0 },
      },
      {
        id: 'google/gemini-2.0-flash-exp:free',
        name: 'Google Gemini 2.0 Flash (Free)',
        provider: 'openrouter',
        contextLength: 1048576,
        tags: ['Fast', 'Long-context'],
        isFree: true,
        pricing: { prompt: 0, completion: 0 },
      },
    ];
  }
}
