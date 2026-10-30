# API (NestJS + Prisma). Build a partir da raiz do monorepo (o docker-compose.yml já faz isso).
FROM node:22-bookworm-slim AS base
# openssl: usado pelo schema engine do Prisma (migrations)
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# --- build: dependências completas (compilador, Prisma generate) ---
FROM base AS build
# Manifests primeiro: a camada de dependências só é refeita quando eles mudam.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# O postinstall gera o client do Prisma: precisa do schema e da config.
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/
# Store e cache do pnpm em pastas temporárias, apagadas na mesma etapa: a camada guarda só o
# node_modules (sem isso, ~1 GB a mais por imagem: o store e o cache do pnpm 11 ficam gravados).
RUN pnpm install --frozen-lockfile --filter @obraflow/api... \
    --store-dir /tmp/pnpm-store --config.cache-dir=/tmp/pnpm-cache \
  && rm -rf /tmp/pnpm-store /tmp/pnpm-cache /root/.cache
COPY apps/api apps/api
# Compila (inclui o seed) e separa só as dependências de produção (sem compilador, testes e lint).
RUN pnpm --filter @obraflow/api build \
  && pnpm --filter @obraflow/api deploy --prod --legacy /prod/api \
    --store-dir /tmp/pnpm-store --config.cache-dir=/tmp/pnpm-cache \
  && rm -rf /tmp/pnpm-store /tmp/pnpm-cache /root/.cache

# --- runtime: só o código compilado + dependências de produção ---
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /prod/api ./
EXPOSE 3333
# Aplica as migrations, popula o banco se estiver vazio e sobe a API.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/prisma/seed-if-empty.js && node dist/src/main.js"]
