import { execSync } from 'node:child_process';
import pg from 'pg';
import { testDatabaseUrl } from './test-database-url.js';

/** Cria o banco de teste (se não existir) e aplica as migrations, uma vez antes de todos os e2e. */
export default async function setup() {
  const url = new URL(testDatabaseUrl());
  const database = url.pathname.slice(1);
  if (!database.endsWith('_test')) {
    throw new Error(
      `Os testes e2e só rodam em banco *_test (recebido: ${database}).`,
    );
  }

  const admin = new URL(url);
  admin.pathname = '/postgres';
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  const { rowCount } = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [database],
  );
  if (!rowCount) await client.query(`CREATE DATABASE "${database}"`);
  await client.end();

  execSync('pnpm exec prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url.toString() },
  });
}
