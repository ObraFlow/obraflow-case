import { spawn, execSync, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    baseUrl: string;
  }
}

function freePort() {
  return new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });
}

async function waitForHealth(url: string, api: ChildProcess) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (api.exitCode !== null) {
      throw new Error(`The API exited with code ${api.exitCode}`);
    }
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('The API did not become healthy in time.');
}

/**
 * Prepares the test database (migrations + fresh demo data) and starts the compiled
 * API on a free port. Run `pnpm build` first (`pnpm test:e2e` does it).
 */
export default async function setup(project: TestProject) {
  const databaseUrl = process.env['TEST_DATABASE_URL']!;
  if (!new URL(databaseUrl).pathname.endsWith('_test')) {
    throw new Error(
      `Refusing to wipe ${databaseUrl}: the database name must end with "_test".`,
    );
  }

  const env = { ...process.env, DATABASE_URL: databaseUrl };
  // deploy creates the database when missing and applies pending migrations;
  // the seed then truncates every table and loads the demo data.
  execSync('pnpm prisma migrate deploy', { env, stdio: 'pipe' });
  execSync('pnpm prisma db seed', { env, stdio: 'pipe' });

  const port = await freePort();
  const api = spawn(process.execPath, ['dist/main.js'], {
    env: {
      ...env,
      PORT: String(port),
      COOKIE_SECRET: 'e2e-test-secret',
    },
    stdio: ['ignore', 'ignore', 'inherit'],
  });

  const baseUrl = `http://localhost:${port}/api`;
  await waitForHealth(baseUrl, api);
  project.provide('baseUrl', baseUrl);

  return () => {
    api.kill();
  };
}
