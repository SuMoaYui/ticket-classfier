import dotenv from 'dotenv';
dotenv.config();

export interface Config {
  port: number;
  nodeEnv: string;
  isDev: boolean;
  isProd: boolean;
  isTest: boolean;
  apiKey: string;
  allowedOrigins: string;
  llmMode: string;
  anthropic: {
    apiKey: string;
    model: string;
  };
  dbPath: string;
}

// ─── Production Safety Guards ─────────────────────────────────────────────────
const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.API_KEY) {
  throw new Error(
    '🔒 FATAL: API_KEY environment variable is required in production. ' +
    'Set it in your .env file or container secrets. Server will NOT start without it.'
  );
}

if (isProd && process.env.LLM_MODE === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
  throw new Error(
    '🔒 FATAL: ANTHROPIC_API_KEY is required when LLM_MODE=anthropic in production.'
  );
}

const config: Config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',
  isProd,
  isTest: process.env.NODE_ENV === 'test',

  // Authentication — fallback ONLY in dev/test
  apiKey: process.env.API_KEY ?? 'dev-api-key-123',

  // CORS — comma-separated origins for production
  allowedOrigins: process.env.ALLOWED_ORIGINS ?? '*',

  // LLM
  llmMode: process.env.LLM_MODE ?? 'mock', // 'mock' | 'anthropic'
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
  },

  // Database
  dbPath: process.env.DB_PATH ?? './data/tickets.db',
};

export default config;
