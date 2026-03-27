import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    env: {
      NODE_ENV: 'test',
      API_KEY: 'test-api-key-123',
      LLM_MODE: 'mock',
      DB_PATH: ':memory:',
    },
  },
});
