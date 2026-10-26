// Configuração do Prisma CLI (Prisma 7 não lê mais a URL do schema.prisma).
// O .env é carregado pelo próprio Node (>= 20.12), sem dependência extra.
import { defineConfig, env } from "prisma/config";

// Sem .env (clone novo antes do `cp .env.example .env`) o Prisma avisa qual variável falta.
try {
  process.loadEnvFile();
} catch {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
