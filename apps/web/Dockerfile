# Front-end (Next.js). Build a partir da raiz do monorepo (o docker-compose.yml já faz isso).
FROM node:22-bookworm-slim AS base
WORKDIR /app

# --- build: dependências completas + next build ---
FROM base AS build
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
# Store e cache do pnpm em pastas temporárias, apagadas na mesma etapa: a camada guarda só o
# node_modules (sem isso, ~1 GB a mais por imagem: o store e o cache do pnpm 11 ficam gravados).
RUN pnpm install --frozen-lockfile --filter @obraflow/web... \
    --store-dir /tmp/pnpm-store --config.cache-dir=/tmp/pnpm-cache \
  && rm -rf /tmp/pnpm-store /tmp/pnpm-cache /root/.cache
COPY apps/web apps/web
# O navegador chama a API direto: a URL pública da API entra no bundle em tempo de build.
ARG NEXT_PUBLIC_API_URL=http://localhost:3333/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
RUN pnpm --filter @obraflow/web build \
  && cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static

# --- runtime: servidor autocontido do Next (~40 MB), sem node_modules completo ---
FROM base AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3030 HOSTNAME=0.0.0.0
COPY --from=build /app/apps/web/.next/standalone ./
EXPOSE 3030
CMD ["node", "apps/web/server.js"]
