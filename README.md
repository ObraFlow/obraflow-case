# ObraFlow

Aplicação full-stack para cadastro de pedidos de compra e aprovação por
alçadas configuráveis por obra. O projeto implementa o fluxo simplificado
proposto no desafio: uma compra possui um ou mais itens, seu valor total
define a faixa aplicável e a cadeia de aprovadores é executada em ordem.

## Demonstração visual

### Cadastro de pedido de compra

![Tela de cadastro de pedido de compra](assets/Cadastro%20de%20pedido%20de%20compra.png)

A tela permite selecionar a obra e o fornecedor, informar a data e observações,
adicionar/remover itens e acompanhar o total calculado do pedido.

### Aprovação

![Tela de aprovação](assets/Aprovação.png)

A tela apresenta os pedidos, seus valores e situações, além das ações
disponíveis para aprovação e rejeição.

### Regras da alçada

![Tela de regras da alçada](assets/Regras%20da%20Alçada.png)

A configuração é feita por obra, com faixas de valor e aprovadores ordenados.

## Stack e motivos das escolhas

### Frontend

- **Next.js 16 e React 18:** estrutura de aplicação, renderização e
  organização por rotas/componentes.
- **TypeScript:** segurança de tipos entre componentes, hooks e integração
  com a API.
- **Zod:** validação dos formulários e validação das respostas recebidas da
  API antes de entrarem no estado da interface.
- **React Query:** provider preparado para gerenciamento de dados assíncronos.
- **Tailwind CSS 4 e CSS modularizado por responsabilidade:** tokens,
  layout, pedidos, regras e responsividade ficam separados em
  `frontend/src/styles`.

### Backend

- **NestJS:** módulos, controllers, injeção de dependência e pipes de
  validação.
- **PostgreSQL:** persistência relacional, integridade referencial, enums e
  transações.
- **Drizzle ORM:** consultas tipadas, schema próximo do SQL e migrations
  versionadas.
- **class-validator/class-transformer:** validação e transformação dos DTOs
  HTTP.

### Infraestrutura

- **Docker Compose:** orquestra PostgreSQL, backend e frontend localmente.
- **Node.js 22 Alpine:** imagens menores e ambiente consistente entre
  desenvolvimento e execução.

## Requisitos

Para executar localmente, instale:

- Docker e Docker Compose; ou
- Node.js 22 ou superior, npm e PostgreSQL 17 ou compatível.

Não são necessárias credenciais externas ou serviços pagos.

## Execução com Docker Compose

O caminho recomendado é iniciar toda a aplicação por Docker:

```bash
docker compose up --build
```

O fluxo de inicialização do backend:

1. aguarda o healthcheck do PostgreSQL;
2. aplica automaticamente as migrations do Drizzle;
3. inicia a API NestJS.

Após a inicialização:

- Frontend: <http://localhost:3000>
- API: <http://localhost:3001>
- PostgreSQL: `localhost:5432`

As migrations criam as tabelas, mas não inserem dados de demonstração.
Execute o seed uma vez:

```bash
docker compose exec backend node dist/database/seed.js
```

O seed cria:

- 2 obras;
- 3 usuários;
- 2 fornecedores;
- regras de alçada para as duas obras;
- 2 pedidos em estados diferentes;
- itens e histórico de aprovações.

O seed não é idempotente. Se for necessário recriar o ambiente de demonstração
do zero, remova o volume do banco e suba os serviços novamente:

```bash
docker compose down -v
docker compose up --build
docker compose exec backend node dist/database/seed.js
```

> `docker compose down -v` remove os dados persistidos do PostgreSQL. Use
> somente quando não houver dados que precisem ser preservados.

### Variáveis do Docker Compose

Os valores padrão funcionam para execução local. Eles podem ser substituídos
por um arquivo `.env` na raiz:

| Variável | Padrão | Uso |
|---|---|---|
| `POSTGRES_PORT` | `5432` | Porta exposta do PostgreSQL |
| `BACKEND_PORT` | `3001` | Porta exposta da API |
| `FRONTEND_PORT` | `3000` | Porta exposta do frontend |
| `FRONTEND_URL` | `http://localhost:3000` | Origem permitida pelo CORS |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | URL da API usada pelo frontend |
| `BUILD_TARGET` | `production` | Target Docker usado pelos serviços |

## Execução sem Docker

### Backend

Suba um PostgreSQL local e configure o ambiente:

```bash
cd backend
cp .env.example .env
npm ci
npm run db:migrate
npm run db:seed
npm run start:dev
```

O arquivo `backend/.env` usa:

```env
PORT=3001
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgres://obraflow:obraflow@localhost:5432/obraflow
```

Adapte `DATABASE_URL` ao usuário, senha, host e porta da sua instalação.

### Frontend

Em outro terminal:

```bash
cd frontend
cp .env.example .env.local
npm ci
npm run dev
```

O arquivo `frontend/.env.local` deve apontar para a API:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Para executar as versões de produção localmente:

```bash
cd frontend
npm run build
npm run start
```

## Arquitetura

### Backend

O backend segue uma separação inspirada em Clean Architecture por módulo:

```text
backend/src/
├── database/
│   ├── schema.ts              # Schema Drizzle
│   ├── migrate.ts             # Runner usado no container
│   └── seed.ts                # Dados de demonstração
└── modules/
    ├── suppliers/
    ├── users/
    ├── works/
    ├── orders/
    └── approval-rules/
        ├── domain/
        │   ├── entities/
        │   └── repositories/  # Contratos de persistência
        ├── application/
        │   ├── dtos/
        │   ├── services/
        │   └── use-cases/
        └── infrastructure/
            ├── controllers/
            └── repositories/  # Implementações Drizzle
```

Entidades e contratos de repositório não dependem de NestJS ou Drizzle.
Controllers adaptam HTTP para casos de uso; services concentram operações
reutilizáveis; repositories concretos ficam na infraestrutura.

### Frontend

```text
frontend/src/
├── app/                       # Páginas e rotas da aplicação Next.js
│   ├── page.tsx               # Novo pedido (/)
│   ├── approvals/page.tsx     # Aprovações (/approvals)
│   └── rules/page.tsx         # Regras de alçada (/rules)
├── components/                # Componentes compartilhados de layout/UI
├── constants/                 # Rotas da API
├── features/
│   ├── works/
│   │   └── hooks/             # Dados de obras
│   ├── suppliers/
│   │   └── hooks/             # Dados de fornecedores
│   ├── users/
│   │   └── hooks/             # Dados de usuários
│   ├── orders/
│   │   ├── components/
│   │   └── hooks/             # Dados e operações de pedidos
│   └── rules/
│       ├── components/
│       └── hooks/             # Dados e operações de regras
├── lib/                       # Cliente HTTP e formatação
├── schemas/                   # Schemas Zod compartilhados
├── styles/                    # Estilos separados por responsabilidade
└── types/                     # Tipos compartilhados da interface
```

As features não importam umas às outras. Componentes compartilhados não
conhecem regras específicas de uma feature. As rotas HTTP ficam centralizadas
em `frontend/src/constants/api-routes.ts`.

## Modelagem do banco de dados

O banco de dados utiliza PostgreSQL e segue um modelo relacional, com tabelas separadas para as principais entidades do sistema e chaves estrangeiras para manter a integridade dos relacionamentos.

```mermaid
erDiagram
    WORKS ||--o{ APPROVAL_RULES : possui
    APPROVAL_RULES ||--o{ APPROVAL_RULE_APPROVERS : define
    USERS ||--o{ APPROVAL_RULE_APPROVERS : participa

    WORKS ||--o{ PURCHASE_ORDERS : recebe
    SUPPLIERS ||--o{ PURCHASE_ORDERS : fornece
    PURCHASE_ORDERS ||--|{ PURCHASE_ORDER_ITEMS : contem
    PURCHASE_ORDERS ||--o{ PURCHASE_ORDER_APPROVALS : registra
    USERS ||--o{ PURCHASE_ORDER_APPROVALS : aprova

    WORKS {
        int id PK
        varchar name
        timestamp created_at
    }

    USERS {
        int id PK
        varchar name
        varchar email UK
        varchar password_hash
        timestamp created_at
    }

    SUPPLIERS {
        int id PK
        varchar name
        varchar document UK
        timestamp created_at
    }

    APPROVAL_RULES {
        int id PK
        int work_id FK
        int minimum_total_cents
        int maximum_total_cents
        timestamp created_at
    }

    APPROVAL_RULE_APPROVERS {
        int id PK
        int rule_id FK
        int user_id FK
        int position
    }

    PURCHASE_ORDERS {
        int id PK
        int work_id FK
        int supplier_id FK
        timestamp order_date
        varchar notes
        int total_cents
        order_status status
        timestamp created_at
    }

    PURCHASE_ORDER_ITEMS {
        int id PK
        int order_id FK
        varchar description
        numeric quantity
        varchar unit
        int unit_price_cents
        int total_cents
    }

    PURCHASE_ORDER_APPROVALS {
        int id PK
        int order_id FK
        int approver_id FK
        int position
        approval_status status
        timestamp decided_at
        varchar rejection_reason
    }
```

### Organização das entidades

- **Obras, usuários e fornecedores:** representam os cadastros básicos utilizados nos pedidos e nas regras de aprovação. O e-mail dos usuários e o documento dos fornecedores são únicos.
- **Regras de alçada:** cada regra pertence a uma obra e define uma faixa de valores por meio dos limites mínimo e máximo, expressos em centavos.
- **Aprovadores das regras:** a tabela `approval_rule_approvers` relaciona usuários às regras e define a ordem em que devem aprovar. A posição é única dentro de cada regra.
- **Pedidos de compra e itens:** cada pedido está associado a uma obra e a um fornecedor, podendo conter vários itens. O cabeçalho armazena o valor total e o status geral, enquanto os itens registram descrição, quantidade, unidade e preços.
- **Histórico de aprovações:** a tabela `purchase_order_approvals` registra os aprovadores, suas posições na cadeia, o status de cada decisão, a data e o motivo de eventual rejeição. A posição é única dentro de cada pedido.

### Decisões de modelagem

Os valores monetários são armazenados como inteiros em centavos, evitando problemas de precisão de ponto flutuante. As quantidades dos itens utilizam `numeric(14,3)`, permitindo representar até três casas decimais.

Os status dos pedidos e das aprovações são definidos por enums do PostgreSQL, restringindo os valores possíveis a `PENDING`, `APPROVED` e `REJECTED`.

A cadeia de aprovadores é materializada no momento da criação do pedido. Dessa forma, as aprovações de um pedido existente permanecem vinculadas à sequência definida naquele momento, mesmo que as regras da obra sejam alteradas posteriormente.

As chaves estrangeiras, restrições de unicidade e transações complementam a modelagem, ajudando a preservar a integridade dos dados durante a criação dos pedidos e o processamento das decisões.

## Regras de negócio

### Criação do pedido

1. O pedido exige obra, fornecedor, data e pelo menos um item.
2. Cada item exige descrição, quantidade positiva, unidade e preço não
   negativo.
3. O frontend exibe os totais para feedback imediato, mas o backend recalcula
   tudo.
4. O total persistido é a soma de `quantidade × preço unitário`.
5. Valores monetários são armazenados e enviados em centavos inteiros.
   Portanto, `1000000` representa R$ 10.000,00.
6. A regra aplicável é a faixa da obra cujo intervalo contém o total e que
   possui o maior limite mínimo.
7. Se não existir uma regra aplicável, o pedido é rejeitado com mensagem de
   validação e não é persistido.
8. A cadeia de aprovadores é copiada para o pedido no momento da criação.
   Alterações futuras nas regras não modificam o histórico de pedidos já
   criados.

### Aprovação e rejeição

- Somente o aprovador da posição pendente pode decidir.
- A aprovação só libera a próxima posição da cadeia.
- A última aprovação altera o pedido para `APPROVED`.
- A rejeição exige um motivo, altera o pedido para `REJECTED` e interrompe
  definitivamente o fluxo.
- Pedidos aprovados ou rejeitados não aceitam novas decisões.
- O histórico mantém aprovador, posição, status, data e motivo da rejeição.

### Regras por obra

Cada regra possui:

- obra;
- limite mínimo em centavos;
- limite máximo opcional em centavos;
- lista ordenada de aprovadores.

Faixas sem limite máximo representam o intervalo final. O backend impede
faixas conflitantes para a mesma obra e aprovadores duplicados na mesma regra.

## API HTTP

Base URL: `http://localhost:3001`

### Obras, usuários e fornecedores

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/works` | Lista obras |
| `POST` | `/works` | Cria uma obra |
| `GET` | `/users` | Lista usuários |
| `POST` | `/users` | Cria um usuário |
| `GET` | `/suppliers` | Lista fornecedores |
| `POST` | `/suppliers` | Cria um fornecedor |

Exemplo de criação de obra:

```json
{
  "name": "Residencial Aurora"
}
```

### Pedidos

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/orders` | Lista pedidos resumidos |
| `GET` | `/orders/:id` | Consulta pedido, itens e histórico |
| `POST` | `/orders` | Cria pedido e cadeia de aprovação |
| `POST` | `/orders/:id/approve` | Aprova a etapa atual |
| `POST` | `/orders/:id/reject` | Rejeita com motivo |

Exemplo de criação:

```json
{
  "workId": 1,
  "supplierId": 1,
  "orderDate": "2026-10-28T12:00:00.000Z",
  "notes": "Compra para a fundação",
  "items": [
    {
      "description": "Cimento",
      "quantity": "20",
      "unit": "saco",
      "unitPriceCents": 4500
    }
  ]
}
```

Payloads de decisão:

```json
{ "userId": 1 }
```

```json
{
  "userId": 1,
  "reason": "Valor fora do orçamento aprovado"
}
```

### Regras de alçada

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/works/:workId/approval-rules` | Lista regras da obra |
| `POST` | `/works/:workId/approval-rules` | Cria uma regra |
| `PATCH` | `/works/:workId/approval-rules/:ruleId` | Edita uma regra |
| `DELETE` | `/works/:workId/approval-rules/:ruleId` | Remove uma regra |

Exemplo:

```json
{
  "minimumTotalCents": 0,
  "maximumTotalCents": 1000000,
  "approvers": [
    { "userId": 1 },
    { "userId": 2 }
  ]
}
```

As respostas de erro usam os status HTTP apropriados, como `400` para
payload/regra inválida, `404` para recurso inexistente e `409` para conflito
de operação. O frontend apresenta o erro e oferece nova tentativa quando a
API está indisponível.

## Comunicação frontend/backend

O frontend usa um cliente HTTP pequeno em `frontend/src/lib/client.ts`.
O endereço base vem de `NEXT_PUBLIC_API_URL`, enquanto os caminhos são
referenciados por constantes. O cliente:

- envia `Content-Type: application/json`;
- interpreta erros HTTP em uma mensagem exibível;
- valida a resposta com Zod;
- trata respostas sem conteúdo (`204`).

Os dados são carregados por hooks separados dentro de cada feature:
`useWorksData`, `useSuppliersData`, `useUsersData`, `useOrdersData` e
`useApprovalRulesData`. Isso mantém cada integração próxima do domínio
correspondente, sem um hook monolítico para todo o sistema.

As telas ficam disponíveis nas rotas `/`, `/approvals` e `/rules`. A navegação
é feita pela URL, portanto a tela atual permanece após recarregar a guia e
também pode ser compartilhada diretamente. Após criar, aprovar, rejeitar ou
alterar uma regra, a tela dispara uma nova leitura para manter o estado visual
alinhado com o banco.

## Estados, validações e responsividade

Os requisitos do desafio são tratados assim:

- **Loading:** indicador de carregamento durante as leituras das listas.
- **Erro/API fora do ar:** mensagem de erro e ação “Tentar novamente”.
- **Empty state:** mensagens específicas quando não existem obras, regras ou
  pedidos.
- **Validação:** Zod no frontend, atributos HTML para feedback imediato e
  DTOs/pipes no backend como validação definitiva.
- **Pedido sem itens:** bloqueado antes do envio e também no backend.
- **Quantidade/preço inválidos:** erro compreensível e nenhum envio.
- **Rejeição sem motivo:** bloqueada antes da chamada.
- **Cadeia concluída:** decisões não são oferecidas para pedidos concluídos.
- **Responsividade:** sidebar, formulários, tabela, cards e regras adaptam-se
  aos breakpoints definidos em `styles/responsive.css`.

## Consistência e integridade dos dados

- Migrations versionadas criam tabelas, enums, chaves estrangeiras e
  restrições únicas.
- Criação do pedido, itens e aprovações ocorre em uma transação.
- Decisões verificam o status atual e a posição pendente dentro de uma
  transação, evitando aprovações fora de ordem.
- Chaves estrangeiras preservam relações entre obras, fornecedores,
  pedidos, regras e usuários.
- Totais são recalculados no backend e armazenados em centavos inteiros.
- O histórico de aprovação é persistido separadamente do cabeçalho do pedido.

## Comandos de desenvolvimento

Backend:

```bash
cd backend
npm run build
npm run lint
npm run format:check
npm test
```

Frontend:

```bash
cd frontend
npm run lint
npm run format:check
npm run build
```

Gerar uma migration após alterar o schema:

```bash
cd backend
npm run db:generate
```

## Decisões técnicas e próximos passos de produção

- **PostgreSQL + Drizzle:** fornece integridade relacional, transações e
  consultas tipadas sem esconder a modelagem SQL.
- **Centavos inteiros:** evita erros de ponto flutuante em valores monetários.
- **Cadeia materializada:** preserva a regra usada no momento da compra.
- **Clean Architecture no backend:** mantém domínio e casos de uso testáveis
  sem acoplamento ao framework ou ao ORM.
- **Features no frontend:** concentra componentes e validações por contexto
  sem transformar páginas em arquivos monolíticos.
- **Migrations no startup Docker:** garante que uma instalação limpa não
  responda 500 por falta de tabelas.

Para produção, eu adicionaria:

- autenticação e autorização por usuário/obra.
- identificação do aprovador a partir da sessão, sem aceitar `userId` vindo
  livremente da interface.
- paginação e filtros na lista de pedidos.
- auditoria imutável e observabilidade.
- testes de integração/e2e para concorrência e regras de alçada.
- modal/formulário dedicado para decisões, substituindo entradas simples.
- atualização em tempo real da fila de aprovação.
- pipelines de CI/CD para build, lint, testes e deploy.
