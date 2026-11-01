import 'dotenv/config';
import path from 'node:path';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL não foi configurada.');
}

const client = postgres(databaseUrl);
const db = drizzle(client);

async function runMigrations(): Promise<void> {
  try {
    await migrate(db, {
      migrationsFolder: path.resolve(__dirname, '../../drizzle'),
    });
    console.log('Migrations do banco aplicadas.');
  } finally {
    await client.end();
  }
}

void runMigrations().catch((error: unknown) => {
  console.error('Não foi possível aplicar as migrations do banco.', error);
  process.exitCode = 1;
});
