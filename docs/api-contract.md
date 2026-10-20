# F00 — Contrato HTTP v1

Status: contrato implementado nas features F02–F06, com filtros adicionais F09. Base local: http://localhost:3000/api. JSON UTF-8. Todos os endpoints de negócio usam X-Demo-User-Id com UUID de usuário existente. Ausência/formato inválido: 400 DEMO_USER_REQUIRED; UUID válido desconhecido: 404 DEMO_USER_NOT_FOUND. É identidade de demonstração, não autenticação.

IDs e valores usados nos exemplos são ilustrativos; não são compromisso de IDs fixos no seed. Regras completas de validação estão em [domain-contract.md](./domain-contract.md).

## Convenções

- Datas civis YYYY-MM-DD; instantes ISO 8601 UTC; dinheiro em strings com 2 casas e quantidades com 3 casas.
- UUIDs gerados pelo servidor; propriedades desconhecidas e parâmetros desconhecidos são erro 400.
- Sucesso de leitura/alteração: 200; criação: 201 e Location. Configuração inexistente de obra existente é 200 com versão zero/faixas vazias.
- Listas: page inteiro >=1, pageSize inteiro 1–100, defaults 1/20. Resposta {data, pagination:{page,pageSize,total,totalPages}}. Sem registros, totalPages=0; página além do fim retorna data vazia.
- GET de regras e detalhes também possui snapshot consistente por resposta; múltiplas consultas usam transação read-only REPEATABLE READ, conforme contrato de negócio.
- Cadastros ordenados por name ASC, id ASC; pedidos por createdAt DESC, id DESC. Totais e página de uma leitura observam snapshot consistente de consulta. Não se promete snapshot entre páginas lidas em momentos diferentes.
- Respostas de negócio não são cacheadas de forma compartilhada. X-Request-Id é gerado pelo servidor e retornado em todas as respostas.
- Corpo JSON maior que 256 KiB retorna 413 PAYLOAD_TOO_LARGE. JSON malformado retorna 400 INVALID_JSON; Content-Type inválido em endpoints com corpo retorna 415 UNSUPPORTED_MEDIA_TYPE.

## Endpoints

| Método     | Caminho                                            | Comportamento                        |
| ---------- | -------------------------------------------------- | ------------------------------------ |
| GET / POST | `/projects`                                        | Listar / cadastrar obras             |
| GET / POST | `/users`                                           | Listar / cadastrar usuários          |
| GET / POST | `/suppliers`                                       | Listar / cadastrar fornecedores      |
| GET        | `/projects/{id}`, `/users/{id}`, `/suppliers/{id}` | Consultar cadastro individual        |
| GET        | `/projects/{projectId}/approval-rules`             | Consultar versão e faixas            |
| PUT        | `/projects/{projectId}/approval-rules`             | Substituir configuração atomicamente |
| POST       | `/orders`                                          | Criar pedido, itens e cadeia         |
| GET        | `/orders`                                          | Listar pedidos paginados             |
| GET        | `/orders/{orderId}`                                | Detalhes, itens, etapas e histórico  |
| POST       | `/orders/{orderId}/decisions`                      | Aprovar ou rejeitar etapa atual      |

Não expor PATCH/DELETE de pedidos ou decisões. CRUD de faixas/aprovadores é atendido pelo editor e substituição da configuração completa via PUT.

## Cadastros

POST /projects, /users ou /suppliers:

```json
{ "name": "Obra Centro" }
```

Resposta 201 com Location `/api/projects/{id}`, `/api/users/{id}` ou `/api/suppliers/{id}`. Resposta de POST e GET individual:

```json
{
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "name": "Obra Centro",
    "createdAt": "2026-10-20T15:00:00.000Z"
  }
}
```

GET /projects?page=1&pageSize=20:

```json
{
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "name": "Obra Centro",
      "createdAt": "2026-10-20T15:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 1, "totalPages": 1 }
}
```

Bootstrap dos usuários é via seed. Sem usuários, instruções de execução devem orientar o seed; não existe exceção implícita para criar usuário sem identidade.

## Configuração de regras

PUT /projects/11111111-1111-4111-8111-111111111111/approval-rules:

```json
{
  "expectedVersion": 0,
  "bands": [
    { "upperLimit": "10000.00", "approverIds": ["22222222-2222-4222-8222-222222222222"] },
    {
      "upperLimit": null,
      "approverIds": [
        "22222222-2222-4222-8222-222222222222",
        "33333333-3333-4333-8333-333333333333"
      ]
    }
  ]
}
```

Resposta 200, mesmo formato do GET:

```json
{
  "data": {
    "projectId": "11111111-1111-4111-8111-111111111111",
    "version": 1,
    "bands": [
      {
        "upperLimit": "10000.00",
        "approvers": [{ "id": "22222222-2222-4222-8222-222222222222", "name": "Amanda" }]
      },
      {
        "upperLimit": null,
        "approvers": [
          { "id": "22222222-2222-4222-8222-222222222222", "name": "Amanda" },
          { "id": "33333333-3333-4333-8333-333333333333", "name": "João" }
        ]
      }
    ]
  }
}
```

expectedVersion é inteiro >=0; até 20 faixas, em ordem válida. bands:[] limpa a configuração, incrementando versão. PUT bem-sucedido sempre incrementa versão, mesmo se conteúdo igual. Versão diferente: 409 RULES_VERSION_CONFLICT; não sobrescrever rascunho do usuário automaticamente. Sem PATCH/DELETE por faixa para evitar configurações parcialmente salvas. IDs internos de faixa não fazem parte do contrato público.

## Cadastro do pedido

POST /orders, headers X-Demo-User-Id e Idempotency-Key (UUID):

```json
{
  "projectId": "11111111-1111-4111-8111-111111111111",
  "supplierId": "44444444-4444-4444-8444-444444444444",
  "orderDate": "2026-10-20",
  "notes": "Compra para a primeira etapa da obra.",
  "items": [
    { "description": "Cimento", "quantity": "10.000", "unit": "un", "unitPrice": "1000.00" },
    { "description": "Frete", "quantity": "1.000", "unit": "un", "unitPrice": "0.01" }
  ]
}
```

201 com Location /api/orders/{id}; corpo OrderDetail como abaixo. notes pode ser omitido ou null. Não enviar total, requesterId, etapas, status ou version. Solicitante vem do usuário de demonstração da requisição.

Idempotency-Key ausente/inválida: 400 IDEMPOTENCY_KEY_REQUIRED. Replay com mesmo conteúdo: 200, corpo original e Idempotency-Replayed:true; Location aponta para GET atual. Primeiro sucesso retorna Idempotency-Replayed:false. Chave reutilizada com outro conteúdo: 409 IDEMPOTENCY_KEY_REUSED. Contrato de concorrência e normalização em domain-contract.md.

Replays são resolvidos antes da seleção da regra vigente. Após resposta perdida, repetir chave, conteúdo e X-Demo-User-Id originais; trocar ator muda o escopo da chave e não é uma forma segura de repetir a tentativa anterior.

## Consulta de pedidos

GET /orders?page=1&pageSize=20&status=PENDING&projectId={uuid}. status e projectId são opcionais. status aceita PENDING, APPROVED ou REJECTED. Filtros combinados com AND; UUID válido sem obra correspondente retorna 404 PROJECT_NOT_FOUND. page tem máximo 1000000. Extensões entregues: mine=true (somente pendentes cuja etapa atual pertence ao usuário) e search=prefixoUUID (1–36 caracteres hexadecimais/hífen, sem #). Esses filtros também combinam com AND e são aplicados no servidor antes da paginação.

Cada elemento da lista é OrderSummary:

```json
{
  "id": "55555555-5555-4555-8555-555555555555",
  "project": { "id": "11111111-1111-4111-8111-111111111111", "name": "Obra Centro" },
  "supplier": { "id": "44444444-4444-4444-8444-444444444444", "name": "Fornecedor Alfa" },
  "requester": { "id": "66666666-6666-4666-8666-666666666666", "name": "Lucas" },
  "orderDate": "2026-10-20",
  "createdAt": "2026-10-20T15:00:00.000Z",
  "itemCount": 2,
  "total": "10000.01",
  "status": "PENDING",
  "version": 1,
  "approval": {
    "completedCount": 0,
    "stepCount": 2,
    "currentStepPosition": 1,
    "steps": [
      {
        "id": "77777777-7777-4777-8777-777777777777",
        "position": 1,
        "approver": { "id": "22222222-2222-4222-8222-222222222222", "name": "Amanda" },
        "status": "CURRENT"
      },
      {
        "id": "88888888-8888-4888-8888-888888888888",
        "position": 2,
        "approver": { "id": "33333333-3333-4333-8333-333333333333", "name": "João" },
        "status": "UPCOMING"
      }
    ]
  },
  "permissions": { "canDecide": true, "blockedReason": null }
}
```

permissions depende do usuário do header. canDecide=false inclui blockedReason NOT_CURRENT_APPROVER ou ORDER_CLOSED. completedCount conta etapas com decisão (aprovação ou rejeição), sem SKIPPED. A lista inclui a cadeia resumida exigida pelo enunciado, sem itens/histórico completo.

GET /orders/{id} retorna {data: OrderDetail}. OrderDetail contém os campos de OrderSummary e adiciona:

```json
{
  "notes": "Compra para a primeira etapa da obra.",
  "ruleSnapshot": { "version": 1, "upperLimit": null },
  "items": [
    {
      "position": 1,
      "description": "Cimento",
      "quantity": "10.000",
      "unit": "un",
      "unitPrice": "1000.00",
      "lineTotal": "10000.00"
    },
    {
      "position": 2,
      "description": "Frete",
      "quantity": "1.000",
      "unit": "un",
      "unitPrice": "0.01",
      "lineTotal": "0.01"
    }
  ],
  "history": []
}
```

history é ordenado por posição da etapa (uma decisão por etapa). Cada evento tem id, stepId, stepPosition, actor:{id,name}, outcome:APPROVE|REJECT, reason:string|null, decidedAt. APPROVE sempre reason=null. Após rejeição, etapas posteriores são SKIPPED e currentStepPosition=null; a situação do pedido é REJECTED.

## Decisão

POST /orders/{id}/decisions:

```json
{ "expectedVersion": 1, "outcome": "APPROVE" }
```

ou:

```json
{
  "expectedVersion": 1,
  "outcome": "REJECT",
  "reason": "Quantidade acima da necessidade desta etapa."
}
```

expectedVersion inteiro >=1. APPROVE não aceita reason; REJECT exige motivo válido. Não enviar ator ou posição. Resposta 200 com {data: OrderDetail} atualizado. Outro usuário: 403 NOT_CURRENT_APPROVER. Versão antiga: 409 ORDER_VERSION_CONFLICT. Pedido encerrado com versão atual: 409 ORDER_CLOSED.

Requisições perdedoras da atualização condicional retornam ORDER_VERSION_CONFLICT. Não tratar conflito como sucesso, nem repetir decisão automaticamente. Interface refaz GET e explica a mudança.

## Erros

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Revise os campos indicados.",
    "fieldErrors": [
      {
        "path": "items.0.quantity",
        "message": "Informe uma quantidade maior que zero, com até 3 casas decimais."
      }
    ],
    "requestId": "99999999-9999-4999-8999-999999999999"
  }
}
```

fieldErrors é sempre array, vazio se não houver erro associado a campo. O requestId coincide com X-Request-Id da resposta. Mensagens para o usuário em pt-BR; códigos estáveis em inglês. Consumidores não devem depender da mensagem literal.

| HTTP | Código                                                                    | Situação                                                                                         |
| ---- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 400  | VALIDATION_ERROR                                                          | Campos, formato UUID de recursos, query, limites, faixas ou referências de aprovadores inválidos |
| 400  | INVALID_JSON                                                              | JSON malformado                                                                                  |
| 400  | DEMO_USER_REQUIRED                                                        | Header ausente ou malformado                                                                     |
| 400  | IDEMPOTENCY_KEY_REQUIRED                                                  | Chave ausente ou malformada na criação                                                           |
| 403  | NOT_CURRENT_APPROVER                                                      | Usuário não atribuído à etapa atual                                                              |
| 404  | DEMO_USER_NOT_FOUND                                                       | Usuário demo inexistente                                                                         |
| 404  | PROJECT_NOT_FOUND / SUPPLIER_NOT_FOUND / USER_NOT_FOUND / ORDER_NOT_FOUND | Recurso direto ou referência principal inexistente                                               |
| 409  | NO_APPLICABLE_RULE                                                        | Obra sem faixa para o total calculado                                                            |
| 409  | RULES_VERSION_CONFLICT                                                    | Configuração mudou desde a leitura                                                               |
| 409  | ORDER_VERSION_CONFLICT                                                    | Pedido mudou desde a leitura                                                                     |
| 409  | ORDER_CLOSED                                                              | Pedido já encerrado                                                                              |
| 409  | IDEMPOTENCY_KEY_REUSED                                                    | Mesma chave de criação com outro conteúdo                                                        |
| 413  | PAYLOAD_TOO_LARGE                                                         | Corpo acima do limite                                                                            |
| 415  | UNSUPPORTED_MEDIA_TYPE                                                    | Endpoint com corpo sem application/json                                                          |
| 500  | INTERNAL_ERROR                                                            | Erro inesperado sem detalhes internos                                                            |

Erros de aprovadores são VALIDATION_ERROR com path bands.N.approverIds.M; recursos principais usam 404. Validação de quantidade de itens usa path items. Excesso de total individual usa items.N; excesso de total geral usa items.

## Verificação

As suítes de integração exercitam os serviços com PostgreSQL; as jornadas Playwright percorrem a API pela interface e verificam erros HTTP. Para chamadas manuais, consulte o exemplo do README e use os IDs retornados pelos cadastros/listas. Este contrato continua versionado junto ao código.
