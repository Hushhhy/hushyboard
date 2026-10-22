import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit tests for pure functions (lib/**). They never touch the database.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules/**', '.next/**', 'generated/**'],
    // Dummy values so modules that import lib/env.ts load. No test reaches a real service.
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      BETTER_AUTH_SECRET: 'test-only-dummy-secret-0000000000000',
      BETTER_AUTH_URL: 'http://localhost:3000',
      GITHUB_CLIENT_ID: 'test',
      GITHUB_CLIENT_SECRET: 'test',
      ALLOWED_GITHUB_ID: '1',
      GEMINI_API_KEY: 'test-only-dummy-gemini-key-000',
    },
  },
});
