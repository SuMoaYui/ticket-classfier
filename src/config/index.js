import dotenv from 'dotenv';
dotenv.config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // Authentication
  apiKey: process.env.API_KEY || 'dev-api-key-123',

  // LLM
  llmMode: process.env.LLM_MODE || 'mock', // 'mock' | 'anthropic'
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
  },

  // Database
  dbPath: process.env.DB_PATH || './data/tickets.db',
};

export default config;
