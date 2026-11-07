import { defineConfig } from "prisma/config";

// Prisma 7 tirou a URL do schema: conexão e seed vivem aqui.
// O fallback existe para que `npx prisma migrate dev` funcione mesmo sem .env carregado.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
