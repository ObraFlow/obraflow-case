import 'dotenv/config';
import { defineConfig } from 'vitest/config';

// End-to-end tests: the compiled API (dist/main.js) runs against its own
// database and the tests talk to it over HTTP, like the front end does.
// The database name must end with "_test": it is wiped before every run.
function testDatabaseUrl() {
  if (process.env['TEST_DATABASE_URL']) return process.env['TEST_DATABASE_URL'];
  const base = process.env['DATABASE_URL'];
  if (!base) {
    throw new Error('Set DATABASE_URL (api/.env) or TEST_DATABASE_URL.');
  }
  const url = new URL(base);
  url.pathname = `${url.pathname.replace(/_test$/, '')}_test`;
  return url.toString();
}

process.env['TEST_DATABASE_URL'] = testDatabaseUrl();

export default defineConfig({
  test: {
    globals: true,
    include: ['test/e2e/**/*.e2e.spec.ts'],
    globalSetup: ['test/e2e/global-setup.ts'],
    // One API and one database for all files: run them one after another.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 120_000,
  },
});
