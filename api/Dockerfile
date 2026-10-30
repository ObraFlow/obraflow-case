# One image for the whole API lifecycle: it keeps the dev dependencies (Prisma
# CLI and tsx) so the container can apply migrations and load the demo data
# before starting. A production image would split build and runtime stages.
FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@10.17.1 --activate
WORKDIR /app

# Dependencies first, so code changes do not reinstall them.
COPY package.json pnpm-lock.yaml ./
# --ignore-scripts: postinstall runs prisma generate, but the schema is copied below.
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
RUN pnpm prisma generate && pnpm build

ENV PORT=3000
EXPOSE 3000

# Migrate, seed only an empty database, then start.
CMD ["sh", "-c", "pnpm prisma migrate deploy && SEED_ONLY_IF_EMPTY=true pnpm prisma db seed && node dist/main"]
