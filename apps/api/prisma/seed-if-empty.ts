// Usado na inicialização do container: popula os dados de demonstração só se o banco estiver vazio.
// Assim, reiniciar o docker compose não apaga o que foi cadastrado (o `pnpm db:seed` sempre recria tudo).
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client.js';
import { seed } from './seed-data.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

try {
  if ((await prisma.user.count()) === 0) {
    console.log(
      'Banco vazio: carregando dados de demonstração…',
      await seed(prisma),
    );
  } else {
    console.log('Banco já tem dados: seed ignorado.');
  }
} finally {
  await prisma.$disconnect();
}
