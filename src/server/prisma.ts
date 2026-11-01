// Singleton do PrismaClient. Só `src/server/services/**` e `prisma/seed.ts` importam daqui.
// Em dev, o Next recarrega módulos a cada edição; guardar a instância em globalThis
// evita abrir um pool de conexões novo a cada hot reload.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalComPrisma = globalThis as unknown as { prisma?: PrismaClient };

function criarPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL não definida. Copie .env.example para .env.");
  }
  const adapter = new PrismaPg(url);
  return new PrismaClient({ adapter });
}

export const prisma = globalComPrisma.prisma ?? criarPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalComPrisma.prisma = prisma;
}
