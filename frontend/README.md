# ObraFlow Frontend

Frontend do sistema ObraFlow - Gestão de Pedidos e Alçadas de Aprovação.

## Stack Tecnológica

- **Framework**: Next.js 14 (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS + shadcn/ui (Radix UI)
- **Gerenciamento de Estado**: TanStack Query (React Query) + Zustand
- **Forms**: React Hook Form + Zod
- **Autenticação**: NextAuth.js v4 (JWT)
- **Testes**: Vitest (unit/integration) + Playwright (E2E)
- **Mocking**: MSW (Mock Service Worker)
- **Containerização**: Docker multi-stage

## Estrutura do Projeto

```
frontend/
├── src/
│   ├── app/                    # App Router (Next.js 14)
│   │   ├── (auth)/            # Rotas públicas (login)
│   │   ├── (dashboard)/       # Rotas protegidas
│   │   │   ├── layout.tsx     # Layout com Sidebar + Header
│   │   │   ├── page.tsx       # Redirect → /pedidos
│   │   │   ├── pedidos/       # Tela 1: Cadastro + Tela 2: Aprovação
│   │   │   └── alcadas/       # Tela 3: Regras de Alçada
│   │   ├── api/auth/          # NextAuth.js route handler
│   │   ├── globals.css        # Tailwind + estilos globais
│   │   ├── layout.tsx         # Root layout
│   │   ├── providers.tsx      # Providers (QueryClient, Session, Theme, Toaster)
│   │   └── middleware.ts      # Auth protection
│   ├── components/
│   │   ├── ui/                # Primitivos shadcn/ui (Button, Input, Select, etc.)
│   │   ├── forms/             # FormField, FormError
│   │   ├── layout/            # Sidebar, Header, Breadcrumb
│   │   ├── feedback/          # LoadingState, EmptyState, ErrorState
│   │   ├── pedidos/           # Componentes específicos de pedidos
│   │   ├── alcadas/           # Componentes específicos de alçadas
│   │   └── shared/            # Componentes compartilhados
│   ├── lib/
│   │   ├── api.ts             # Fetch wrapper + types (mirror backend DTOs)
│   │   ├── auth.ts            # NextAuth config
│   │   ├── queryClient.ts     # TanStack Query config
│   │   ├── utils.ts           # cn(), formatCurrency, formatDate, etc.
│   │   ├── validations/       # Zod schemas
│   │   └── constants.ts       # Constantes (roles, situacoes, etc.)
│   ├── hooks/                 # Custom hooks (useAuth, usePedidos, etc.)
│   ├── store/                 # Zustand stores (uiStore)
│   ├── types/                 # Tipos TypeScript
│   ├── mocks/                 # MSW handlers (integration tests)
│   └── test/                  # Vitest setup
├── tests/                     # Playwright E2E tests
├── public/                    # Assets estáticos
├── .github/workflows/         # GitHub Actions CI
├── .env.local.example         # Variáveis de ambiente
├── Dockerfile                 # Multi-stage Docker build
├── docker-compose.yml         # Orquestração local
├── next.config.js             # Next.js config
├── tailwind.config.ts         # Tailwind theme
├── tsconfig.json              # TypeScript config
├── vitest.config.ts           # Vitest config
└── playwright.config.ts       # Playwright config
```

## Como Rodar Localmente

### Pré-requisitos

- Node.js 20+
- Docker & Docker Compose
- Backend rodando em `http://localhost:8080` (ver `../backend/README.md`)

### Instalação

```bash
cd frontend
cp .env.local.example .env.local
npm install
```

### Desenvolvimento

```bash
# Terminal 1 - Backend (se não estiver rodando via Docker)
cd ../backend && ./mvnw spring-boot:run

# Terminal 2 - Frontend
cd frontend && npm run dev
```

Acesse: http://localhost:3000

### Com Docker Compose (Stack Completa)

```bash
# Na raiz do projeto
docker-compose up -d
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui.html
- Health Check: http://localhost:8080/actuator/health

## Credenciais de Acesso (Demo)

Você pode utilizar as seguintes credenciais padrão para testar diferentes papéis e níveis de aprovação no sistema:

| Nome / Perfil | E-mail | Senha | Papéis / Permissões |
| :--- | :--- | :--- | :--- |
| **Amanda** (Admin / Aprovador) | `amanda.souza@obraflow.com.br` | `obraflow123` | `ADMIN`, `APROVADOR` |
| **João** (Aprovador) | `joao.silva@obraflow.com.br` | `obraflow123` | `APROVADOR` |
| **Carlos** (Aprovador) | `carlos.santos@obraflow.com.br` | `obraflow123` | `APROVADOR` |
| **Patrícia** (Aprovador) | `patricia.lima@obraflow.com` | `obraflow123` | `APROVADOR` |
| **Bruno** (Aprovador) | `bruno.alves@obraflow.com` | `obraflow123` | `APROVADOR` |

## Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run start        # Servidor de produção
npm run lint         # ESLint
npm run typecheck    # TypeScript check
npm run format       # Prettier format
npm run format:check # Verificar formatação
npm run test         # Testes unitários (Vitest)
npm run test:watch   # Testes em watch mode
npm run test:ui      # Vitest UI
npm run test:e2e     # Testes E2E (Playwright)
npm run test:e2e:ui  # Playwright UI
```

## Testes

### Unitários (Vitest)

```bash
npm run test          # Executa uma vez
npm run test:watch    # Watch mode
npm run test:ui       # Interface visual
```

### Integração (MSW)

```bash
# Os handlers MSW estão em src/mocks/handlers.ts
# Testes de integração em *.integration.test.tsx
```

### E2E (Playwright)

```bash
# Requer backend rodando
npm run test:e2e      # Headless
npm run test:e2e:ui   # Com interface
```

## Arquitetura

### Server Components vs Client Components

| Tipo | Uso |
|------|-----|
| **Server Components** (padrão) | Data fetching inicial, SEO, páginas estáticas |
| **Client Components** (`'use client'`) | Forms, modais, drag-drop, optimistic updates, toasts |

### Data Fetching

```typescript
// Server Component - fetch direto com token da sessão
const pedidos = await api.getPedidos(filters);

// Client Component - TanStack Query
const { data } = useQuery({
  queryKey: ['pedidos', filters],
  queryFn: () => api.getPedidos(filters),
});
```

### Mutations (Server Actions)

```typescript
// Server Action tipada + revalidateTag
export async function approvePedido(id: string) {
  await apiFetch(`/pedidos/${id}/decisoes`, {
    method: 'POST',
    body: JSON.stringify({ decisao: 'APROVADO' }),
  });
  revalidateTag('pedidos');
  revalidateTag(`pedido-${id}`);
}

// Client Component
const [_, approve] = useActionState(approvePedido, null);
<Button onClick={() => startTransition(() => approve(id))}>Aprovar</Button>
```

## Telas Implementadas

### 1. Cadastro de Pedido (`/pedidos/novo`)
- Dados gerais: Obra, Fornecedor, Data, Observações
- Itens dinâmicos: Descrição, Quantidade, Unidade, Preço Unitário
- Total calculado em tempo real
- Validação Zod (client + server)
- Submit via Server Action

### 2. Aprovação (`/pedidos` + `/pedidos/[id]`)
- Lista com filtros (situação, obra, fornecedor, paginação)
- Detalhe com timeline vertical da alçada
- Ações: Aprovar / Rejeitar (com motivo obrigatório)
- Estados: Pendente, Aprovado, Rejeitado
- Otimistic updates + rollback

### 3. Regras de Alçada (`/alcadas` → `/alcadas/[obraId]`)
- Seletor de obra
- CRUD de faixas (limite inferior/superior, descrição)
- Drag-and-drop para reordenar aprovadores (@dnd-kit)
- Simulação de alçada por valor
- Validação de sobreposição de faixas

## Dark Mode

Suporte nativo via `next-themes`:
- Sistema (padrão)
- Claro
- Escuro

Persistido no `localStorage` e sincronizado com `prefers-color-scheme`.

## Acessibilidade (WCAG 2.1 AA)

- Semantic HTML5
- ARIA labels/descriptions
- Focus visible (`focus-visible:ring-2`)
- Keyboard navigation (Tab, Enter, Escape)
- Color contrast ≥ 4.5:1
- Screen reader announcements (`aria-live`)
- Reduced motion support

## Docker

### Multi-stage Build

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

### Docker Compose

```bash
docker-compose up -d --build
```

## CI/CD (GitHub Actions)

Pipeline em `.github/workflows/ci.yml`:

1. **Lint & Typecheck** - ESLint + TypeScript
2. **Test** - Unit/Integration (Vitest)
3. **E2E** - Playwright (Chromium/Firefox/WebKit)
4. **Docker** - Build multi-stage images
5. **Deploy Preview** - Em PRs

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `NEXT_PUBLIC_APP_URL` | URL do frontend | `http://localhost:3000` |
| `BACKEND_URL` | URL do backend API | `http://localhost:8080` |
| `NEXTAUTH_URL` | URL do NextAuth | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Secret JWT (min 32 chars) | **Obrigatório em prod** |

## Deploy em Produção

1. Configure variáveis de ambiente
2. Build: `docker-compose -f docker-compose.yml -f docker-compose.prod.yml build`
4. Deploy: `docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d`

## Estrutura de Branches

- `main` - Produção
- `develop` - Staging
- `feature/*` - Features
- `hotfix/*` - Correções urgentes

## Convenções

- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **Branches**: `feature/nome`, `fix/nome`, `chore/nome`
- **PRs**: Template obrigatório, review obrigatório

## Troubleshooting

### Erro de CORS
- Verifique se `BACKEND_URL` está correto
- Backend deve permitir origem do frontend

### Erro de Autenticação
- Verifique `NEXTAUTH_SECRET` (min 32 chars)
- Verifique se backend está rodando

### Build Falha
- `npm run typecheck` para ver erros TypeScript
- `npm run lint` para ver erros ESLint

### Testes Falham
- `npm run test:ui` para debug visual
- Verifique se MSW handlers cobrem os endpoints

## Recursos Úteis

- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [NextAuth.js](https://next-auth.js.org/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)
- [Playwright](https://playwright.dev/)
- [MSW](https://mswjs.io/)