# Contrato da API — Dokimos

API HTTP + JSON consumida pelo front-end (Next.js). Derivada dos requisitos do enunciado (`docs/DESAFIO.md`) e do design em `docs/design/export/canvas/`.

- **Base URL:** `http://localhost:3333/api`
- **Documentação interativa:** `http://localhost:3333/api/docs` (Swagger)
- **Autenticação:** nenhuma. O sistema é uma simulação: o front escolhe o usuário em "Visualizando como" e usa esse id nos filtros e no `requesterId`. Uma decisão (aprovar/rejeitar) é sempre atribuída ao aprovador da etapa atual.

## Convenções

| Assunto | Regra |
|---|---|
| Nomes | Rotas, campos e enums em inglês; mensagens de erro em português (prontas para exibir). |
| Dinheiro | **String decimal** com até 2 casas, nas duas direções: `"12500.00"`. Nunca `number` (evita erro de ponto flutuante). |
| Quantidade | String decimal com até 3 casas: `"12.5"`. |
| Datas | `orderDate` é só data: `"2026-10-21"`. Timestamps em ISO 8601 UTC: `"2026-10-21T14:32:00.000Z"`. |
| IDs | Inteiros de 1 a 2.147.483.647 (fora disso → `400`). Pedidos também têm `code` legível: `"PED-001"`. |
| Totais | Sempre calculados pelo backend. O cliente nunca envia totais. |
| Listas | Retornam `{ "data": [...] }`. A lista de pedidos é paginada (`meta`). |

### Enums

```text
OrderStatus = PENDING | APPROVED | REJECTED
StepStatus  = WAITING   (etapa futura, ainda não chegou a vez)
            | PENDING   (etapa atual, aguardando decisão)
            | APPROVED
            | REJECTED
            | SKIPPED   (etapa que não chegou a acontecer porque o pedido foi rejeitado antes)
Unit        = un | kg | m | m2 | m3 | h | sc | l      (o front exibe m², m³)
HistoryType = CREATED | APPROVED | REJECTED
```

### Formato de erro

Todas as respostas de erro seguem o mesmo formato:

```json
{
  "statusCode": 422,
  "code": "NO_APPROVAL_RULE",
  "message": "Nenhuma faixa de alçada cobre R$ 80.000,00 na obra Edifício Maré.",
  "details": []
}
```

Em erros de validação, `details` aponta o campo exato (inclusive dentro de itens), o que permite ao front mostrar o erro na linha certa:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Dados inválidos.",
  "details": [
    { "field": "supplierId", "message": "Selecione um fornecedor." },
    { "field": "items.1.quantity", "message": "A quantidade deve ser maior que zero." },
    { "field": "items.2.unitPrice", "message": "Preço unitário inválido." }
  ]
}
```

| HTTP | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Corpo ou query inválidos (formato, obrigatórios, limites). |
| 404 | `NOT_FOUND` | Recurso da URL não existe. |
| 409 | `STEP_NOT_CURRENT` | A etapa enviada não é mais a etapa atual (alguém decidiu antes / tela desatualizada). |
| 409 | `ORDER_ALREADY_DECIDED` | O pedido já está aprovado ou rejeitado. |
| 409 | `DUPLICATE_LIMIT` | Já existe uma faixa com esse limite na obra. |
| 409 | `UNLIMITED_RULE_EXISTS` | A obra já tem uma faixa "sem limite". |
| 409 | `DUPLICATE_EMAIL` | E-mail de usuário já cadastrado. |
| 409 | `CONFLICT` | Outra violação de unicidade no banco (rede de segurança). |
| 422 | `NO_APPROVAL_RULE` | Nenhuma faixa cobre o total do pedido. Pedido não é criado. |
| 422 | `INVALID_REFERENCE` | Um id referenciado no corpo (obra, fornecedor, usuário) não existe. |
| 500 | `INTERNAL_ERROR` | Erro inesperado. O front mostra "Tentar novamente". |
| 503 | `SERVICE_UNAVAILABLE` | Banco de dados fora do ar (`/health`). |

---

## Modelo da alçada (resumo)

- Cada obra tem N **faixas** (`approval-rules`). Uma faixa guarda apenas o **limite superior** (`maxAmount`) e a **cadeia ordenada** de aprovadores. `maxAmount: null` significa "sem limite".
- O **início** de cada faixa é calculado: ordenando por `maxAmount`, a faixa cobre `(limite da faixa anterior, maxAmount]`. A primeira começa em `0.00`. Com isso, **não existem buracos nem sobreposições** entre faixas.
- Restrições por obra: `maxAmount` único e no máximo uma faixa "sem limite".
- **Faixas não são cumulativas:** o pedido cai em exatamente uma faixa e segue só a cadeia dela.
- Se a obra não tem faixa "sem limite" e o total passa do maior limite, ou se a obra não tem faixas, o pedido é **bloqueado** (`422 NO_APPROVAL_RULE`).
- Ao criar o pedido, a cadeia é **copiada** para o pedido (etapas). Editar ou remover faixas depois **não altera** pedidos existentes.

---

## Recursos

### Health

`GET /health` → `200 { "status": "ok" }`, ou `503 SERVICE_UNAVAILABLE` se o banco estiver fora do ar. Usado pelo docker compose e pelo front para checar se a API está no ar.

### Usuários

**`GET /users`** → `200`
```json
{
  "data": [
    { "id": 1, "name": "João Ribeiro", "email": "joao@obraflow.dev", "jobTitle": "Engenheiro de obra", "initials": "JR" }
  ]
}
```

**`POST /users`** → `201` com o usuário criado.
```json
{ "name": "Fernando Souza", "email": "fernando@obraflow.dev", "jobTitle": "Coordenador de obra" }
```
Validação: `name` 2–120, `email` válido e único (`409 DUPLICATE_EMAIL`), `jobTitle` 2–80.

### Obras

**`GET /projects`** → `200`
```json
{
  "data": [
    { "id": 1, "name": "Edifício Maré", "city": "Salvador", "ruleCount": 3, "coverage": "FULL" }
  ]
}
```
`coverage`: `NONE` (sem faixas), `PARTIAL` (sem faixa "sem limite") ou `FULL`. Permite avisar no formulário de pedido antes mesmo de digitar os itens.

**`POST /projects`** → `201`
```json
{ "name": "Torre das Artes", "city": "Salvador" }
```

### Fornecedores

**`GET /suppliers?q=voto`** → `200`. `q` é opcional (busca por nome, sem diferenciar maiúsculas).
```json
{ "data": [ { "id": 1, "name": "Votorantim Cimentos", "taxId": "12345678000190" } ] }
```

**`POST /suppliers`** → `201`
```json
{ "name": "Amanco", "taxId": "00.000.000/0001-00" }
```
`taxId` (CNPJ) é opcional; aceita com ou sem pontuação e é gravado só com os 14 dígitos (assim o mesmo CNPJ não é cadastrado duas vezes com formatações diferentes → `409 CONFLICT`).

---

### Regras de alçada (faixas)

**`GET /projects/:projectId/approval-rules`** → `200`

As faixas vêm ordenadas por valor, já com o início calculado e o resumo de cobertura (usado na régua).

```json
{
  "projectId": 1,
  "coverage": { "status": "PARTIAL", "uncoveredFrom": "50000.01" },
  "data": [
    {
      "id": 10,
      "position": 1,
      "fromAmount": "0.00",
      "maxAmount": "10000.00",
      "approvers": [
        { "position": 1, "user": { "id": 1, "name": "João Ribeiro", "jobTitle": "Engenheiro de obra", "initials": "JR" } }
      ],
      "updatedAt": "2026-10-20T12:00:00.000Z"
    },
    {
      "id": 11,
      "position": 2,
      "fromAmount": "10000.01",
      "maxAmount": "50000.00",
      "approvers": [
        { "position": 1, "user": { "id": 1, "name": "João Ribeiro", "jobTitle": "Engenheiro de obra", "initials": "JR" } },
        { "position": 2, "user": { "id": 2, "name": "Amanda Costa", "jobTitle": "Gerente de suprimentos", "initials": "AC" } }
      ],
      "updatedAt": "2026-10-20T12:00:00.000Z"
    }
  ]
}
```
- `position`: ordem da faixa (1 = menor valor). É calculada, não armazenada.
- `coverage.uncoveredFrom`: a partir de qual valor os pedidos são bloqueados (`null` quando `FULL`; `"0.00"` quando `NONE`).

**`POST /projects/:projectId/approval-rules`** → `201` com a faixa criada.
```json
{ "maxAmount": "50000.00", "approverIds": [1, 2] }
```
```json
{ "maxAmount": null, "approverIds": [1, 2, 3] }
```
- `maxAmount`: string decimal > 0, ou `null` para "sem limite".
- `approverIds`: 1–10 ids de usuários, **sem repetição**. **A ordem do array é a ordem do fluxo.**
- Erros: `400` (vazio, repetido, formato), `409 DUPLICATE_LIMIT`, `409 UNLIMITED_RULE_EXISTS`, `422 INVALID_REFERENCE` (usuário inexistente), `404` (obra).

**`PUT /approval-rules/:id`** → `200` com a faixa atualizada. Mesmo corpo do POST. Substitui o limite e a cadeia inteira. **Reordenar aprovadores = enviar o array na nova ordem.**

**`DELETE /approval-rules/:id`** → `204`. Pedidos já criados não são afetados.

**`GET /projects/:projectId/approval-rules/resolve?amount=23000.00`** → `200`

Prévia da cadeia. É usada pelo painel "Cadeia de aprovação" do formulário e pelo "Testar valor" da tela de alçadas. Usa exatamente a mesma função da criação do pedido.

```json
{
  "amount": "23000.00",
  "matched": true,
  "rule": { "id": 11, "position": 2, "fromAmount": "10000.01", "maxAmount": "50000.00",
            "approvers": [ { "position": 1, "user": { "id": 1, "name": "João Ribeiro", "jobTitle": "Engenheiro de obra", "initials": "JR" } } ] }
}
```
```json
{ "amount": "80000.00", "matched": false, "rule": null,
  "message": "Nenhuma faixa de alçada cobre R$ 80.000,00 na obra Edifício Maré." }
```
Não encontrar uma faixa **não é erro** aqui (`200`, `matched: false`): é uma prévia.

---

### Pedidos de compra

#### `POST /purchase-orders` → `201`

```json
{
  "projectId": 1,
  "supplierId": 1,
  "requesterId": 4,
  "orderDate": "2026-10-21",
  "notes": "Concretagem agendada para sexta-feira.",
  "items": [
    { "description": "Cimento CP-II 50kg", "quantity": "100", "unit": "sc", "unitPrice": "32.00" },
    { "description": "Areia média", "quantity": "12", "unit": "m3", "unitPrice": "145.00" }
  ]
}
```

Validação:
| Campo | Regra |
|---|---|
| `projectId`, `supplierId`, `requesterId` | obrigatórios; devem existir (`422 INVALID_REFERENCE`) |
| `orderDate` | obrigatório, `YYYY-MM-DD` válido |
| `notes` | opcional, até 1000 caracteres |
| `items` | 1–100 itens (`"O pedido precisa ter pelo menos 1 item."`) |
| `items[].description` | obrigatória, 2–200 caracteres |
| `items[].quantity` | decimal > 0, até 3 casas |
| `items[].unit` | um dos valores de `Unit` |
| `items[].unitPrice` | decimal ≥ 0, até 2 casas |
| totais | o total de cada item e o do pedido precisam caber em R$ 999.999.999.999,99 (`400` em `items.N` ou `items`) |

Processamento, numa **única transação**:
1. Calcula `total` de cada item (`quantity × unitPrice`, arredondado a 2 casas) e o `totalAmount` do pedido.
2. Resolve a faixa da obra para o `totalAmount`. Sem faixa → `422 NO_APPROVAL_RULE` e nada é gravado.
3. Grava o cabeçalho, os itens e as etapas (cópia da cadeia). A etapa 1 fica `PENDING`, as demais `WAITING`. `currentStep = 1`.
4. Registra o evento `CREATED` no histórico.

Resposta: o **detalhe** do pedido (mesmo formato do `GET /purchase-orders/:id`).

#### `GET /purchase-orders` → `200`

| Query | Descrição |
|---|---|
| `status` | `PENDING`, `APPROVED` ou `REJECTED` (omitido = todos) |
| `projectId` | filtra por obra |
| `awaitingUserId` | só pedidos cuja **etapa atual** é deste usuário (aba "Aguardando minha decisão") |
| `q` | busca por fornecedor ou código (`PED-001` ou `1`) |
| `page`, `pageSize` | padrão `1` e `20`; `pageSize` máximo `100` |

Ordenação: mais recentes primeiro.

```json
{
  "data": [
    {
      "id": 12,
      "code": "PED-012",
      "orderDate": "2026-10-18",
      "project": { "id": 1, "name": "Edifício Maré" },
      "supplier": { "id": 1, "name": "Votorantim Cimentos" },
      "requester": { "id": 4, "name": "Beatriz Lima", "initials": "BL" },
      "itemCount": 3,
      "totalAmount": "12500.00",
      "status": "PENDING",
      "currentStep": 2,
      "steps": [
        { "id": 31, "position": 1, "status": "APPROVED", "approver": { "id": 1, "name": "João Ribeiro", "jobTitle": "Engenheiro de obra", "initials": "JR" }, "decidedAt": "2026-10-18T14:32:00.000Z" },
        { "id": 32, "position": 2, "status": "PENDING",  "approver": { "id": 2, "name": "Amanda Costa", "jobTitle": "Gerente de suprimentos", "initials": "AC" }, "decidedAt": null }
      ],
      "createdAt": "2026-10-18T09:12:00.000Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 1 },
  "counts": { "awaiting": 2, "pending": 4, "approved": 7, "rejected": 2, "all": 13 }
}
```
- `steps` alimenta o stepper da coluna "Alçada" (concluídos ✓ / atual ● / próximos ○) e decide se os botões aparecem: o front mostra "Aprovar/Rejeitar" quando `steps[currentStep-1].approver.id === usuárioSelecionado`.
- `currentStep` é `null` quando o pedido está `APPROVED` ou `REJECTED`.
- `counts` alimenta os contadores das abas. Considera os filtros `projectId` e `q`, mas **ignora** `status` (para todas as abas mostrarem números). `awaiting` só vem preenchido quando `awaitingUserId` é enviado.

#### `GET /purchase-orders/:id` → `200`

Tudo do item da lista, mais:

```json
{
  "id": 12,
  "code": "PED-012",
  "...": "campos da lista",
  "notes": "Entrega urgente — obra parada.",
  "appliedRule": { "fromAmount": "10000.01", "maxAmount": "50000.00" },
  "items": [
    { "id": 1, "position": 1, "description": "Cimento CP-II 50kg", "quantity": "100", "unit": "sc", "unitPrice": "32.00", "total": "3200.00" }
  ],
  "history": [
    { "id": 1, "type": "CREATED",  "actor": { "id": 4, "name": "Beatriz Lima" }, "at": "2026-10-18T09:12:00.000Z", "stepPosition": null, "reason": null },
    { "id": 2, "type": "APPROVED", "actor": { "id": 1, "name": "João Ribeiro" }, "at": "2026-10-18T14:32:00.000Z", "stepPosition": 1, "reason": null }
  ]
}
```
- `appliedRule` é uma **cópia** da faixa no momento da criação. Continua correta mesmo se a faixa for editada ou removida depois.
- `history` é **append-only**: só recebe eventos, nunca é editado.
- Na rejeição: `{ "type": "REJECTED", "reason": "Preço acima da cotação de referência.", ... }`.

#### `POST /purchase-orders/:id/approve` → `200`

```json
{ "stepId": 32 }
```

O `stepId` é a etapa que o usuário **estava vendo** quando clicou. Ele funciona como controle de concorrência otimista:

1. O pedido precisa estar `PENDING` → senão `409 ORDER_ALREADY_DECIDED`.
2. `stepId` precisa ser a etapa atual → senão `409 STEP_NOT_CURRENT` (o front mostra o toast "Este pedido já foi decidido por outra pessoa" e recarrega a lista).
3. Na transação: a etapa vira `APPROVED` e registra o evento `APPROVED`. Se existir próxima etapa, ela vira `PENDING` e `currentStep` avança. Se não existir, o pedido vira `APPROVED` e `currentStep = null`.
4. A atualização do pedido é **condicional** (`WHERE id = :id AND status = 'PENDING' AND currentStep = :posição`). Se duas requisições chegarem juntas, só uma vence; a outra recebe `409`.

Resposta: o detalhe atualizado do pedido.

#### `POST /purchase-orders/:id/reject` → `200`

```json
{ "stepId": 32, "reason": "Preço acima da cotação de referência." }
```
- `reason`: obrigatório, 10–1000 caracteres (sem contar espaços nas pontas) → senão `400`.
- Mesmas regras de concorrência do approve.
- Na transação: a etapa vira `REJECTED`, as etapas seguintes viram `SKIPPED`, o pedido vira `REJECTED`, `currentStep = null` e registra o evento `REJECTED` com o motivo.
- Pedido rejeitado é final: não pode ser reaberto (para refazer a compra, cria-se outro pedido).

Resposta: o detalhe atualizado do pedido.

---

## Mapa tela → endpoints

| Tela | Endpoints |
|---|---|
| Topbar "Visualizando como" | `GET /users` |
| Novo pedido | `GET /projects`, `GET /suppliers?q=`, `GET /projects/:id/approval-rules/resolve?amount=` (debounced), `POST /purchase-orders` |
| Pedidos (lista + abas) | `GET /purchase-orders?status=&projectId=&awaitingUserId=&q=` |
| Drawer do pedido | `GET /purchase-orders/:id`, `POST .../approve`, `POST .../reject` |
| Alçadas | `GET /projects`, `GET /users`, `GET /projects/:id/approval-rules`, `POST`/`PUT`/`DELETE` faixas, `GET .../resolve` ("Testar valor") |

## Fora do escopo (decisões conscientes)

- Login/autorização por cargo: simulado no front. Em produção: JWT e validação no backend de que o usuário autenticado é o aprovador da etapa.
- Edição ou cancelamento de pedido após o cadastro.
- Notificações (e-mail/push).
- Telas de cadastro de obra, usuário e fornecedor (a API expõe `POST`, mas os dados vêm do seed).
