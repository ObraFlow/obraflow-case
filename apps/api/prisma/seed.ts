// Executar: pnpm db:seed — APAGA os dados atuais e recria os dados de demonstração.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client.js';
import { seed } from './seed-data.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

seed(prisma)
  .then((summary) => console.log('Seed concluído:', summary))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
