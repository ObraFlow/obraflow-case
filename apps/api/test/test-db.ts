// Banco de teste para os e2e do front (Playwright), que não importam código da API.
//   tsx test/test-db.ts prepare → cria o banco dokimos_test (se preciso), aplica migrations e popula
//   tsx test/test-db.ts reset   → volta os dados ao estado do seed (rápido, usado antes de cada teste)
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client.js';
import { seed } from '../prisma/seed-data.js';
import setup from './global-setup.js';
import { testDatabaseUrl } from './test-database-url.js';

const command = process.argv[2];
if (command !== 'prepare' && command !== 'reset') {
  console.error('Uso: tsx test/test-db.ts <prepare|reset>');
  process.exit(1);
}

if (command === 'prepare') await setup(); // também recusa qualquer banco que não seja *_test

const url = testDatabaseUrl();
if (!new URL(url).pathname.endsWith('_test')) {
  throw new Error('test-db só roda em banco *_test.');
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
await seed(prisma);
await prisma.$disconnect();
