import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from server directory first, then fallback to cwd
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

// Resolve absolute path to SQLite dev.db in prisma directory
const defaultDbPath = path.resolve(__dirname, '../prisma/dev.db').replace(/\\/g, '/');
let resolvedDbUrl = process.env.DATABASE_URL;
if (!resolvedDbUrl || resolvedDbUrl === 'file:./dev.db' || resolvedDbUrl.startsWith('file:.') || resolvedDbUrl.startsWith('file:dev.db')) {
  resolvedDbUrl = `file:${defaultDbPath}`;
}
process.env.DATABASE_URL = resolvedDbUrl;

const defaultStorageDir = path.resolve(__dirname, '../storage');

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  databaseUrl: resolvedDbUrl,
  storageDir: process.env.STORAGE_DIR ? path.resolve(process.env.STORAGE_DIR) : defaultStorageDir,
  providers: {
    openrouter: {
      id: 'openrouter' as const,
      name: 'OpenRouter',
      baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      listModelsPath: '/models',
      chatCompletionsPath: '/chat/completions',
      docsUrl: 'https://openrouter.ai/docs',
      keyHelpUrl: 'https://openrouter.ai/keys',
      description: 'Aggregates open-source and frontier models. Surfaces live 100% free models.',
      freeTierNotes: 'Look for models ending in :free or openrouter/free router. Zero token cost.',
    },
    groq: {
      id: 'groq' as const,
      name: 'Groq Cloud',
      baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
      listModelsPath: '/models',
      chatCompletionsPath: '/chat/completions',
      docsUrl: 'https://console.groq.com/docs/models',
      keyHelpUrl: 'https://console.groq.com/keys',
      description: 'Ultra-low latency LPU inference for Llama 3, Gemma, and DeepSeek models.',
      freeTierNotes: 'Entire developer catalog is free with generous per-minute rate limits.',
    },
    nvidia_nim: {
      id: 'nvidia_nim' as const,
      name: 'NVIDIA NIM',
      baseUrl: process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1',
      listModelsPath: '/models',
      chatCompletionsPath: '/chat/completions',
      docsUrl: 'https://build.nvidia.com',
      keyHelpUrl: 'https://build.nvidia.com',
      description: 'Enterprise open-weight models including Nemotron and large Llama models.',
      freeTierNotes: 'Free API credits provided for testing through the NVIDIA Developer Program.',
    },
    local_llm: {
      id: 'local_llm' as const,
      name: 'Local LLM (Ollama / LM Studio)',
      baseUrl: process.env.LOCAL_LLM_BASE_URL || 'http://localhost:11434/v1',
      listModelsPath: '/models',
      chatCompletionsPath: '/chat/completions',
      docsUrl: 'https://ollama.com',
      keyHelpUrl: 'https://ollama.com/download',
      description: 'Run private offline inference via Ollama, LM Studio, or vLLM with zero API cost.',
      freeTierNotes: '100% free, private, offline execution on your own machine GPU/CPU.',
    },
  },
};

