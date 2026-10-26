# ObraFlow — Dokimos (pedidos de compra com aprovação por alçada)

> Em construção. Seções de screenshots, modelagem da alçada e API serão preenchidas ao longo do desafio.

## Como rodar

Pré-requisitos: Node 24+, Docker.

```bash
cp .env.example .env
npm install
npm run db:up        # sobe o Postgres (docker compose)
npm run db:migrate   # aplica as migrations e gera o client
npm run db:seed      # dados de demonstração
npm run dev          # http://localhost:3000
```

Outros scripts: `npm run check` (lint + tsc + testes), `npm test`, `npm run db:studio`, `npm run db:down`.

## Tecnologias e motivos

| Dependência | Por quê |
|---|---|
| Next.js 16 (App Router, RSC) | Front e back no mesmo projeto. Server Components para listagens, server actions para mutações, `loading.tsx`/`error.tsx` por rota. |
| Tailwind v4 + shadcn/ui | Componentes acessíveis copiados para o repositório (`src/components/ui`), sem lib de UI como dependência fechada. O CLI `shadcn` fica em devDependencies. |
| Prisma 7 + PostgreSQL | Schema declarativo, migrations versionadas e transações. Postgres por ser o banco que uma empresa usaria em produção. |
| `@prisma/adapter-pg` | O Prisma 7 exige um driver adapter; este é o adapter oficial para Postgres (usa `pg` por baixo). |
| Zod | Um único schema de validação compartilhado entre formulário (client) e server action/API (server). |
| react-hook-form + `@hookform/resolvers` | `useFieldArray` resolve a lista de N itens do pedido; o resolver liga o Zod ao formulário. |
| Vitest | Testes unitários apenas em `src/domain` (regras de alçada são funções puras). |
| `sonner`, `lucide-react`, `next-themes`, `@base-ui/react`, `class-variance-authority`, `cn`, `tw-animate-css` | Trazidos pelo shadcn/ui (toasts, ícones, tema, primitivos acessíveis, variantes de classe, animações). |

Sem autenticação por escopo do desafio: o usuário atual é simulado por um seletor "Agindo como" no header, persistido em cookie.

## Decisões técnicas

1. **Sem `dotenv`.** O `prisma.config.ts` carrega o `.env` com `process.loadEnvFile()`, nativo do Node 20.12+. O Next já lê o `.env` sozinho. Uma dependência a menos.
2. **Client do Prisma gerado em `src/generated/prisma`** (ignorado no git) e regenerado por `prisma migrate dev`. Em clone novo, basta seguir "Como rodar".
3. **Scripts `db:*` no `package.json`** para o avaliador não precisar conhecer o Prisma CLI nem o docker compose.
