import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

// Prisma 7 conecta por driver adapter; a URL não vive mais no schema.
const criar = () =>
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({
      url: process.env.DATABASE_URL ?? "file:./dev.db",
    }),
  });

// O dev server do Next recarrega módulos a cada edição; sem o singleton, cada
// recarga abriria uma conexão nova e o SQLite acabaria esgotando descritores.
const global_ = globalThis as unknown as { prisma?: ReturnType<typeof criar> };

export const prisma = global_.prisma ?? criar();

if (process.env.NODE_ENV !== "production") global_.prisma = prisma;
