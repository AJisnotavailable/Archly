import { AIModel } from '@archly/shared-types';
import { config } from '../config';

export async function fetchNvidiaNimModels(apiKey?: string): Promise<AIModel[]> {
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Archly/1.0',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const res = await fetch(`${config.providers.nvidia_nim.baseUrl}/models`, {
      headers,
    });

    if (!res.ok) {
      throw new Error(`NVIDIA NIM models HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json() as { data: Array<{ id: string; owned_by?: string }> };
    const rawList = json.data || [];

    const validModels = rawList.filter((m) => {
      const id = m.id.toLowerCase();
      return !id.includes('embed') && !id.includes('rerank') && !id.includes('guard');
    });

    return validModels.map((m) => {
      const id = m.id.toLowerCase();
      const tags: ('Fast' | 'Reasoning' | 'Long-context' | 'Coding' | 'Recommended')[] = [];

      if (id.includes('70b') || id.includes('reason') || id.includes('nemotron')) {
        tags.push('Reasoning');
      }
      if (id.includes('code') || id.includes('coder') || id.includes('starcoder')) {
        tags.push('Coding');
      }
      if (id.includes('8b') || id.includes('mini') || id.includes('small')) {
        tags.push('Fast');
      }
      if (id.includes('128k') || id.includes('nemotron') || id.includes('llama-3.1')) {
        tags.push('Long-context');
      }
      if (id.includes('meta/llama-3.1-70b-instruct') || id.includes('nvidia/nemotron-4-340b-instruct')) {
        tags.push('Recommended');
      }

      return {
        id: m.id,
        name: `NVIDIA: ${m.id}`,
        provider: 'nvidia_nim',
        contextLength: 128000,
        tags: tags.length > 0 ? tags : ['Reasoning'],
        isFree: true,
        description: 'Hosted on NVIDIA accelerated infrastructure with developer free prototyping tier.',
        pricing: { prompt: 0, completion: 0 },
      };
    });
  } catch (err: any) {
    console.warn('Failed to fetch live NVIDIA NIM models, using standard NIM catalog:', err.message);
    return [
      {
        id: 'meta/llama-3.1-70b-instruct',
        name: 'NVIDIA: Meta Llama 3.1 70B Instruct',
        provider: 'nvidia_nim',
        contextLength: 128000,
        tags: ['Recommended', 'Reasoning', 'Long-context'],
        isFree: true,
        pricing: { prompt: 0, completion: 0 },
      },
      {
        id: 'meta/llama-3.1-8b-instruct',
        name: 'NVIDIA: Meta Llama 3.1 8B Instruct',
        provider: 'nvidia_nim',
        contextLength: 128000,
        tags: ['Fast', 'Recommended'],
        isFree: true,
        pricing: { prompt: 0, completion: 0 },
      },
      {
        id: 'nvidia/nemotron-4-340b-instruct',
        name: 'NVIDIA: Nemotron-4 340B Instruct',
        provider: 'nvidia_nim',
        contextLength: 128000,
        tags: ['Reasoning', 'Long-context'],
        isFree: true,
        pricing: { prompt: 0, completion: 0 },
      },
      {
        id: 'qwen/qwen2.5-72b-instruct',
        name: 'NVIDIA: Qwen 2.5 72B Instruct',
        provider: 'nvidia_nim',
        contextLength: 64000,
        tags: ['Coding', 'Reasoning'],
        isFree: true,
        pricing: { prompt: 0, completion: 0 },
      },
    ];
  }
}
