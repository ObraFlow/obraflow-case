import { defineConfig } from 'vitest/config';
import { testDatabaseUrl } from './test/test-database-url.js';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: { DATABASE_URL: testDatabaseUrl() },
    globalSetup: ['./test/global-setup.ts'],
    // Os arquivos compartilham o mesmo banco: rodam um de cada vez.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
