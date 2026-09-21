import { Router, Request, Response } from 'express';
import { config } from '../config';
import { prisma } from '../db/client';
import { fetchOpenRouterModels } from '../adapters/openrouter';
import { fetchGroqModels } from '../adapters/groq';
import { fetchNvidiaNimModels } from '../adapters/nvidiaNim';
import { fetchLocalLlmModels } from '../adapters/localLlm';
import { getDemoModels } from '../adapters/demoProvider';
import { AIModel, ProviderId } from '@archly/shared-types';

export const providersRouter = Router();

// In-memory hot cache for instant model catalog lookups (TTL: 15 minutes)
const memoryCatalogCache = new Map<string, { data: AIModel[]; expiresAt: number }>();

// GET /api/providers - list supported providers
providersRouter.get('/', (req: Request, res: Response) => {
  const list = Object.values(config.providers).map((p) => ({
    id: p.id,
    name: p.name,
    baseUrl: p.baseUrl,
    docsUrl: p.docsUrl,
    keyHelpUrl: p.keyHelpUrl,
    description: p.description,
    freeTierNotes: p.freeTierNotes,
  }));
  res.json(list);
});

// GET /api/providers/:provider/models - live or cached free models
providersRouter.get('/:provider/models', async (req: Request, res: Response) => {
  const provider = req.params.provider as ProviderId;
  const apiKey = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || (req.query.apiKey as string);
  const baseUrl = (req.query.baseUrl as string) || (req.headers['x-local-base-url'] as string);
  const forceRefresh = req.query.refresh === 'true';

  if (!config.providers[provider as keyof typeof config.providers]) {
    return res.status(404).json({ error: `Unknown provider: ${provider}` });
  }

  // 1. Hot In-Memory Cache Check (0ms latency, skip for local_llm and forceRefresh)
  const cacheKey = `${provider}:${apiKey ? 'auth' : 'anon'}:${baseUrl || ''}`;
  const now = Date.now();
  if (!forceRefresh && provider !== 'local_llm') {
    const memCached = memoryCatalogCache.get(cacheKey);
    if (memCached && memCached.expiresAt > now) {
      return res.json(memCached.data);
    }
  }

  // 2. Check cache in SQLite (TTL: 30 minutes, skip for local_llm to reflect local downloads immediately)
  const CACHE_TTL_MS = 30 * 60 * 1000;
  if (!forceRefresh && provider !== 'local_llm') {
    try {
      const cached = await prisma.modelCatalogCache.findUnique({
        where: { provider },
      });
      if (cached && now - new Date(cached.fetchedAt).getTime() < CACHE_TTL_MS) {
        const models = JSON.parse(cached.modelsJson) as AIModel[];
        memoryCatalogCache.set(cacheKey, { data: models, expiresAt: now + 15 * 60 * 1000 });
        return res.json(models);
      }
    } catch (e) {
      console.warn('Cache lookup failed, proceeding to live fetch:', e);
    }
  }

  try {
    let models: AIModel[] = [];
    if (provider === 'openrouter') {
      models = await fetchOpenRouterModels();
    } else if (provider === 'groq') {
      models = await fetchGroqModels(apiKey);
    } else if (provider === 'nvidia_nim') {
      models = await fetchNvidiaNimModels(apiKey);
    } else if (provider === 'local_llm') {
      models = await fetchLocalLlmModels(baseUrl || config.providers.local_llm.baseUrl);
    }

    // Save to cache
    try {
      await prisma.modelCatalogCache.upsert({
        where: { provider },
        create: {
          provider,
          modelsJson: JSON.stringify(models),
          fetchedAt: new Date(),
        },
        update: {
          modelsJson: JSON.stringify(models),
          fetchedAt: new Date(),
        },
      });
      if (provider !== 'local_llm') {
        memoryCatalogCache.set(cacheKey, { data: models, expiresAt: Date.now() + 15 * 60 * 1000 });
      }
    } catch (e) {
      console.warn('Failed to update model cache in DB:', e);
    }

    res.json(models);
  } catch (err: any) {
    console.error(`Error fetching models for ${provider}:`, err);
    res.status(500).json({ error: err.message || 'Failed to fetch models' });
  }
});
