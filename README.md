# ObraFlow

Aplicação web para cadastrar pedidos de compra e submetê-los a uma cadeia de aprovação por alçada. O projeto tem telas para novo pedido, aprovações e regras de alçada por obra.

## Como rodar

### Pré-requisitos

- Node.js 20.9 ou superior.
- Docker Desktop com Docker Compose.
- PowerShell (Windows) ou Bash.

O projeto usa Next.js 16.4.3, Prisma 7 e PostgreSQL 15. O arquivo `.env.example` contém apenas a chave `DATABASE_URL`; ela precisa apontar para o PostgreSQL usado pela aplicação. Para o `docker-compose.yml` deste repositório, a URL local é:

```text
postgresql://admin:admin@127.0.0.1:5433/obraflow?schema=public
```

### Instalação no PowerShell

```powershell
git clone <URL_DO_REPOSITORIO>
Set-Location obraflow-case
Copy-Item .env.example .env
# Edite .env e defina DATABASE_URL
docker compose up -d
npm install
npm run setup
npm run dev
```

### Instalação no Bash

```bash
git clone <URL_DO_REPOSITORIO>
cd obraflow-case
cp .env.example .env
# Edite .env e defina DATABASE_URL
docker compose up -d
npm install
npm run setup
npm run dev
```

Abra <http://localhost:3000>.

O comando `npm run setup` aplica as migrações e popula o banco com os dados de demonstração.

### Testes

```bash
npm test
```

O comando executa o Vitest em modo não interativo.

### Usuário atual

O seletor **Atuando como** fica no cabeçalho. Ele carrega os usuários retornados por `GET /api/users` e grava o ID selecionado no `localStorage`; esse ID é enviado no header `X-User-Id` nas requisições.

O seed é idempotente: limpa os dados relacionais existentes e recria usuários, obras, fornecedores, regras e pedidos de demonstração.

## Dados de demonstração

Os dados de demonstração são criados por `npm run db:seed` ou `npm run setup`.

| Tipo | Dados |
|---|---|
| Obras | 2 |
| Regras | 5 |
| Usuários | 3 |
| Fornecedores | 3 |
| Pedidos | 5, cobrindo pendências, aprovação e rejeições |

## Screenshots

Abaixo estão as demonstrações da interface com os dados populados pelo seed:

### Novo Pedido
![Novo Pedido](./docs/screenshots/pedidoNovo.png)

### Aprovações
![Aprovações](<./docs/screenshots/Tela Aprovação.png>)

### Regras de Alçada
![Regras de Alçada](./docs/screenshots/TelaRegrasAlçada.png)

## Decisões técnicas

### Tecnologias e motivos

- Next.js 16 com App Router e TypeScript para páginas e Route Handlers no mesmo projeto.
- React 19 para as telas client-side.
- Tailwind CSS 4 para estilos responsivos locais às telas.
- Prisma 7 com `@prisma/adapter-pg` para acesso tipado ao PostgreSQL.
- Zod para validar payloads de pedidos, regras e rejeições.
- Vitest para testes unitários de domínio e schemas.

### Alçada: modelagem, cálculo e persistência

- `ApprovalRule.upTo` guarda o limite em centavos. O limite é inclusivo: uma regra vale quando `totalCents <= upTo`; `NULL` representa uma faixa sem teto.
- `resolveRule` ordena as faixas pelo limite e escolhe a primeira que comporta o total. A regra vitalícia centralizada (`src/shared/approval.ts`) garante coerência entre o client-side e o server-side.
- Ao criar um pedido, `createOrder` recalcula os totais no servidor, resolve a regra e grava uma cadeia em `OrderApproval`. O primeiro passo começa como `PENDING`; os demais começam como `WAITING`.
- A cadeia gravada em `OrderApproval` é um snapshot. Alterar regras depois não altera pedidos existentes.
- Aprovações e rejeições atualizam o estado do pedido e dos passos da cadeia em uma transação.
- Se não houver regra aplicável, a API retorna `422` e a tela de novo pedido bloqueia o cadastro.

### Comunicação front/back

- A comunicação é REST por Route Handlers em `src/app/api`.
- Erros são convertidos pelo helper `handle` para `{ "message": "..." }`, devolvendo um mapa completo dos erros do Zod quando necessário.
- `X-User-Id` simula a autenticação atual. Não é uma autenticação adequada para produção.

### Consistência e integridade

- Criação de pedidos, decisões e substituição das regras usam transações Prisma.
- A decisão usa `updateMany` condicionado a `status: "PENDING"`; uma segunda decisão concorrente recebe `409` (Guarda de concorrência).
- O total do pedido é calculado no servidor a partir dos itens recebidos.
- Zod valida os payloads nos Route Handlers; a interface também valida campos antes do envio.
- O schema tem chaves únicas para nomes de obras, e-mails, identificadores fiscais, posições de aprovadores, aprovador por faixa, itens por posição e passos por pedido.
- **Para garantir integridade a nível de banco de dados, foi criada uma migration com instruções SQL brutas adicionando `CHECK constraints` (impedindo valores monetários e quantidades negativas) e um índice único parcial para garantir apenas uma regra sem teto (`upTo IS NULL`) por obra.**

### O que mudaria em produção

- Substituir `X-User-Id` por autenticação real e RBAC (controle de acesso baseado em papéis).
- Avaliar `BigInt`/`Decimal` para valores e quantidades quando os limites de `Int` não forem suficientes.
- Usar locking explícito ou estratégia equivalente para fluxos de aprovação com maior concorrência.
- Adicionar notificações e filas para avisos de aprovação.
- Adicionar paginação às listas.
- Adicionar logs estruturados, métricas e rastreamento.
- Ampliar a cobertura com testes end-to-end.
- Configurar CI com lint, build, testes e migrações.
- Fazer deploy com imagem Docker e banco gerenciado.

### Limitações conhecidas

- Não há autenticação ou autorização por papel; o seed de demonstração está disponível em `prisma/seed.ts` e o seletor de usuário é apenas uma simulação local.
- A aplicação depende de um PostgreSQL acessível por `DATABASE_URL`.
- Não há paginação nas listas.
- Não há notificações, filas ou observabilidade estruturada.

## API

Todos os erros tratados pelos Route Handlers usam o formato `{ "message": "..." }`.

| Método | Rota | Payload | Resposta | Erros principais |
|---|---|---|---|---|
| GET | `/api/orders` | — | Lista de pedidos com obra, fornecedor, itens, passos, total e status | `500` |
| POST | `/api/orders` | `{ siteId, supplierId, orderDate, notes?, items[] }` | `201 { id }` | `400` JSON/Zod; `404` obra/fornecedor; `422` sem regra ou aprovadores |
| POST | `/api/orders/[id]/approve` | —; exige `X-User-Id` | `{ id, status }` | `400` ID; `401` usuário ausente; `403` fora da vez; `404` inexistente; `409` fluxo encerrado/concorrência |
| POST | `/api/orders/[id]/reject` | `{ reason }`; exige `X-User-Id` | `{ id, status }` | `400` ID, JSON ou motivo; `401` usuário ausente; `403` fora da vez; `404` inexistente; `409` fluxo encerrado/concorrência |
| GET | `/api/sites` | — | `[{ id, name }]` | `500` |
| POST | `/api/sites` | `{ name }` | `201 { id }` | `400` JSON/Zod; `500` |
| GET | `/api/sites/[id]/rules` | — | `[{ upTo, approvers }]` | `400` ID; `404` não é lançado para lista vazia; `500` |
| PUT | `/api/sites/[id]/rules` | `[{ upTo, approvers[] }]` | Regras salvas da obra | `400` ID/JSON/Zod; `404` obra; `422` aprovador inexistente; `500` |
| GET | `/api/suppliers` | — | `[{ id, name }]` | `500` |
| POST | `/api/suppliers` | `{ name, taxId }` | `201 { id }` | `400` JSON/Zod; `500` |
| GET | `/api/users` | — | `[{ id, name }]` | `500` |
| POST | `/api/users` | `{ name, email }` | `201 { id }` | `400` JSON/Zod; `500` |

`orderDate` usa `YYYY-MM-DD`. Os valores monetários são enviados e retornados em centavos; na tela, são exibidos em reais.