---
name: next16
description: Mapa de qual doc local do Next.js 16 ler antes de usar server actions, route handlers, cookies, params, proxy (ex-middleware), loading/error, cache ou revalidate. Este projeto roda Next 16.4, que difere do conhecimento prévio do modelo.
---

# Next.js 16 neste projeto: leia o doc local antes de codar

A versão instalada é a **16.4.2**. APIs e convenções mudaram em relação ao que o modelo "sabe". O próprio Next avisa isso em `AGENTS.md`. Regra: **antes de escrever código que use uma API do Next, leia o arquivo correspondente** abaixo com `Read`. Todos ficam em `node_modules/next/dist/docs/01-app/`.

| Vou usar… | Leia |
|---|---|
| Server actions (`"use server"`, `revalidatePath`, retorno de erro para o form) | `01-getting-started/07-mutating-data.md` |
| Route handlers (`app/api/**/route.ts`, `NextResponse`, status 409) | `01-getting-started/15-route-handlers.md` |
| `cookies()` (seletor "Agindo como"), `headers()`, `params`, `searchParams` | `01-getting-started/06-fetching-data.md` e `03-api-reference/04-functions/cookies.md` |
| `loading.tsx`, `error.tsx`, `not-found` | `01-getting-started/10-error-handling.md` e `03-api-reference/03-file-conventions/{loading,error}.md` |
| Cache, `cacheComponents`, `"use cache"` | `01-getting-started/08-caching.md` |
| Revalidar após mutação | `01-getting-started/09-revalidating.md` |
| Proxy de requisições (o antigo `middleware.ts`) | `01-getting-started/16-proxy.md` |
| Server vs client components, serialização de props | `01-getting-started/05-server-and-client-components.md` |
| Layouts, route groups `(telas)` | `01-getting-started/03-layouts-and-pages.md` e `03-api-reference/03-file-conventions/route-groups.md` |

## Diferenças que já derrubaram código antes (confirme no doc, não confie na memória)

- `cookies()`, `headers()`, `params` e `searchParams` são **assíncronos**: `const c = await cookies()`.
- `middleware.ts` foi substituído por `proxy.ts`.
- Turbopack é o bundler padrão; o Tailwind v4 entra via `@tailwindcss/turbopack`.
- `Decimal` do Prisma e `Date` **não** atravessam a fronteira RSC → client: converta para string/number antes de passar como prop.
- Route handlers não recebem o cookie "Agindo como" automaticamente em chamadas externas: a API recebe `usuarioId` no payload e documenta isso no README.
- **Cache do Turbopack em `.next` pode servir CSS velho** mesmo depois de reiniciar o `next dev` (aconteceu com `globals.css` em 26/10). Se uma mudança de CSS/tema não aparece no browser, pare o server, apague `.next` e suba de novo antes de procurar o bug em outro lugar.

Se o doc local contradisser algo que você "lembra", o doc vence. Cite o arquivo lido na resposta.
