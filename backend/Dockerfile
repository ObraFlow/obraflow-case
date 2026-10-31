# Backend NestJS + Prisma (Node 24 para rodar o seed .ts via type-stripping nativo).
FROM node:24-bookworm-slim

WORKDIR /app

# openssl é requerido pelo engine do Prisma.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN npm install
RUN npx prisma generate

COPY . .
RUN npm run build

EXPOSE 3000
ENTRYPOINT ["sh", "docker-entrypoint.sh"]
