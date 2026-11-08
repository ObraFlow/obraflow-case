# ObraFlow · Pedidos de compra com alçada de aprovação

Minha solução do desafio full-stack do ObraFlow (Dokimos). São três telas, Novo pedido, Aprovações e Regras de alçada, em cima de uma API HTTP com SQLite, documentada em OpenAPI e coberta por testes de API, de interface e ponta a ponta.

Feito por **Leonardo Pires**, desenvolvedor front-end · [leopires.dev](https://www.leopires.dev) · [GitHub](https://github.com/Leonardo-PiresF) · [LinkedIn](https://www.linkedin.com/in/leonardo-pires-ferreira) · [lpferreira2003@gmail.com](mailto:lpferreira2003@gmail.com) · [(75) 98847-2549](https://wa.me/5575988472549)

O enunciado original está em [`docs/DESAFIO.md`](docs/DESAFIO.md).

![Painel de compras](docs/screenshots/18-painel.png)

Fui além do enunciado em alguns pontos, porque achei que fariam falta no uso real: um painel de compras (gasto aprovado x orçamento por obra, gasto por mês, maiores fornecedores e atividade recente), orçamento por obra com o impacto de cada pedido mostrado antes do envio, aprovação em lote, totais e contadores no topo das aprovações, alerta de pedido parado há 3 dias ou mais, lembrete pronto no WhatsApp para o aprovador da vez, "Corrigir e reenviar" para pedido rejeitado, bloqueio para quem aprova cadastrar o próprio pedido (segregação de funções), tema escuro, documentação da API em `/api/docs` e testes E2E com Playwright.

---

## Como rodar

Precisa de Node.js 20.19 ou mais novo (testei no 22). Não precisa de Docker, banco externo nem credencial.

```bash
npm install        # instala front e back (npm workspaces)
npm run setup      # cria o banco SQLite, aplica as migrações e carrega os dados de demonstração
npm run dev        # sobe a API (porta 3333) e o front (porta 5173)
```

Abra http://localhost:5173. A documentação interativa da API fica em http://localhost:5173/api/docs.

| Comando               | O que faz                                                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run setup`       | Apaga e recria `server/data/obraflow.db` com os dados de demonstração. Rode de novo sempre que quiser voltar ao estado inicial (com o `dev` parado).                                  |
| `npm run dev`         | API com recarga automática (`tsx watch`) + Vite. O Vite repassa `/api` para a porta 3333.                                                                                             |
| `npm test`            | 40 testes da API (regra de alçada, fluxo de aprovação, segregação, reenvio, prazo, painel de gastos, integridade do banco) + 24 do front (validação, formatação, correção de pedido). |
| `npm run test:e2e`    | 11 testes ponta a ponta no navegador (desktop e celular). Sobem API e front próprios (portas 3334 e 5174), com banco separado. Na primeira vez: `npx playwright install chromium`.   |
| `npm run typecheck`   | Checagem de tipos dos dois projetos.                                                                                                                                                  |
| `npm run format`      | Prettier em tudo que é código do projeto (server, web, e2e e deploy).                                                                                                                 |
| `npm run build:vercel` | Monta a demo online no formato da Vercel (ver "Demo online").                                                                                                                        |

A API aplica as migrações sozinha ao subir. Então `npm run dev` também funciona sem o `setup`, só que com o banco vazio, o que é bom para ver os empty states.

### Quem está usando?

O desafio não pede login, então no canto da barra lateral deixei o seletor "Atuando como". Ele simula a sessão e manda o usuário escolhido no header `X-User-Id`. Para testar o fluxo, troque de pessoa: um pedido da faixa intermediária da OB-101 precisa ser aprovado primeiro como João Menezes e depois como Amanda Ribeiro.

---

## Dados de demonstração

| Obra                                      | Faixas (aprovadores na ordem)                                                                                          |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **OB-101** Residencial Mirante do Vale    | Até R$ 10.000,00: João · R$ 10.000,01 a R$ 100.000,00: João → Amanda · Acima de R$ 100.000,00: João → Amanda → Ricardo |
| **OB-102** Edifício Corporativo Horizonte | Até R$ 5.000,00: Beatriz · R$ 5.000,01 a R$ 50.000,00: Beatriz → Carla · _sem faixa acima de R$ 50 mil (de propósito)_ |
| **OB-103** Galpão Logístico BR-324        | _nenhuma faixa (de propósito)_                                                                                         |

Os usuários são Pedro Santana (comprador), João Menezes e Beatriz Moura (engenheiros residentes), Amanda Ribeiro (gerente de obras), Carla Nunes (diretora financeira) e Ricardo Teles (sócio-diretor). Há cinco fornecedores. Os orçamentos são R$ 450 mil na OB-101, R$ 140 mil na OB-102 (já perto do limite, para aparecer o alerta) e R$ 1,2 milhão na OB-103.

Além dos 8 pedidos de demonstração, o seed cria 13 compras já aprovadas nos cinco meses anteriores, para o painel ter série histórica (os testes da API rodam sem esse histórico, para as somas serem exatas). Os 8 principais cobrem todos os estados, com datas relativas ao dia em que o `setup` roda: aprovado com 1 e com 2 níveis, pendente no 1º nível de uma cadeia de 3, parado há 6 dias com a Amanda (o João já aprovou), parado há 4 dias com a Beatriz, um rejeitado com motivo e a correção dele já reenviada, e um que chegou hoje.

O seed (`server/src/db/seed.ts`) chama os mesmos serviços da API. Assim os dados de demonstração passam pelas mesmas regras de cálculo e de alçada de um pedido criado pela tela.

---

## Telas

|                                                                                                                                                                                                                          |                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| ![Painel de compras](docs/screenshots/18-painel.png)                                                                                                                                                                     | ![Painel no tema escuro](docs/screenshots/19-painel-escuro.png)                                                             |
| Painel de compras: gasto aprovado x orçamento, gasto por mês, fornecedores, obras e atividade.                                                                                                                           | Tema escuro, com os mesmos tokens.                                                                                          |
| ![Lista de aprovações](docs/screenshots/01-aprovacoes-lista.png)                                                                                                                                                         | <img src="docs/screenshots/20-mobile-painel.png" width="200">                                                               |
| Aprovações: cards de resumo que filtram, abas com contagem e tabela com a etapa atual.                                                                                                                                   | Painel no celular.                                                                                                          |
| ![Novo pedido pronto para envio](docs/screenshots/05-novo-pedido-pronto.png)                                                                                                                                             | ![Validação no cadastro](docs/screenshots/04-novo-pedido-validacao.png)                                                     |
| Novo pedido: o resumo lateral mostra o total e, ao vivo, qual faixa e quais aprovadores o pedido vai seguir.                                                                                                             | Validação por campo: o erro aparece no item certo depois da interação, e o botão explica o que falta.                       |
| ![Obra sem regra](docs/screenshots/06-novo-pedido-sem-regra.png)                                                                                                                                                         | ![Aprovador cadastrando](docs/screenshots/14-auto-aprovacao.png)                                                            |
| Sem regra aplicável: o envio é bloqueado, com link direto para configurar a obra.                                                                                                                                        | Segregação de funções: quem está na alçada não cadastra o próprio pedido, e a tela sugere quem pode.                        |
| ![Detalhe aguardando](docs/screenshots/02-aprovacao-detalhe-aguardando.png)                                                                                                                                              | ![Detalhe rejeitado](docs/screenshots/03-aprovacao-detalhe-rejeitado.png)                                                   |
| Detalhe do pedido, lido como documento: decisão no topo explicando por que você pode ou não decidir, dados em grade, alçada em tabela (etapa, aprovador, situação, data) com tempo de espera e lembrete no WhatsApp.      | Rejeitado: motivo em destaque, botões desabilitados com explicação e o link para a correção.                                |
| ![Corrigir e reenviar](docs/screenshots/13-corrigir-e-reenviar.png)                                                                                                                                                      | ![Rejeitar sem motivo](docs/screenshots/09-rejeitar-sem-motivo.png)                                                         |
| Corrigir e reenviar: o formulário vem preenchido com o pedido rejeitado e o motivo à vista.                                                                                                                              | A rejeição exige motivo, validado antes do envio.                                                                           |
| ![Regras](docs/screenshots/07-regras.png)                                                                                                                                                                                | ![Editando faixa](docs/screenshots/08-regras-editando.png)                                                                  |
| Regras de alçada: lista das obras com faixas configuradas e o que está em aprovação; abaixo, as faixas, o simulador de valor e os usuários disponíveis.                                                                  | Edição de faixa: limite, aprovadores com reordenação e aviso de valores sem cobertura.                                      |
| ![Tema escuro](docs/screenshots/15-tema-escuro.png)                                                                                                                                                                      | ![Documentação da API](docs/screenshots/16-api-docs.png)                                                                    |
| Tema escuro, seguindo o sistema ou escolhido na barra lateral.                                                                                                                                                           | Documentação da API, gerada dos mesmos schemas que validam as requisições.                                                  |
| ![Aprovação em lote](docs/screenshots/17-aprovacao-em-lote.png)                                                                                                                                                          | <img src="docs/screenshots/10-mobile-lista.png" width="200"> <img src="docs/screenshots/11-mobile-detalhe.png" width="200"> |
| Aprovação em lote: confirmação com os pedidos selecionados e o total.                                                                                                                                                    | Celular: a tabela empilha as colunas e o detalhe ocupa a tela.                                                              |
| ![Erro de API](docs/screenshots/12-erro-api.png)                                                                                                                                                                         |                                                                                                                             |
| API fora do ar: estado de erro com "Tentar novamente".                                                                                                                                                                   |                                                                                                                             |

---

## API

A base é `http://localhost:3333/api`, com JSON nos dois sentidos. As ações que dependem de quem está agindo exigem o header `X-User-Id`.

A documentação interativa (Swagger UI) fica em `/api/docs`, e o contrato OpenAPI em `/api/docs/json`. Os schemas de entrada saem dos mesmos schemas Zod que validam as rotas (`server/src/openapi.ts`), então documentação e validação não se desencontram.

Convenções de valores:

- Dinheiro sempre em centavos inteiros (`unitPriceCents: 12990` = R$ 129,90).
- Quantidade como string decimal com até 3 casas (`"2.5"`), para não passar por float.
- Datas do pedido em `AAAA-MM-DD`; timestamps em ISO 8601 UTC.

Todo erro sai no mesmo formato:

```json
{ "error": { "code": "OUT_OF_ORDER", "message": "Sua etapa é a 2 de 3. Aguarde a decisão de João Menezes (etapa 1).", "details": [] } }
```

Em erro de validação (`400 VALIDATION_ERROR`), `details` traz `[{ "path": "items.1.quantity", "message": "..." }]`, que o front usa para marcar o campo exato.

### Endpoints

| Método     | Rota                                   | Descrição                                                                                                    |
| ---------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| GET        | `/health`                              | Healthcheck                                                                                                  |
| GET / POST | `/users`                               | Lista / cria usuário `{ name, email, role, phone? }`                                                         |
| GET / POST | `/sites`                               | Lista obras (com `kind`, `budgetCents`, `tierCount`, `approvedCents`, `pendingCount` e `pendingCents`) / cria `{ code, name, city, kind?, budgetCents? }` |
| GET / POST | `/suppliers`                           | Lista / cria fornecedor `{ name, cnpj }`                                                                     |
| GET        | `/units`                               | Unidades aceitas nos itens                                                                                   |
| GET        | `/sites/:id/tiers`                     | Faixas da obra, ordenadas, com piso calculado e aprovadores na ordem                                         |
| POST       | `/sites/:id/tiers`                     | Cria faixa `{ upToCents: number \| null, approverIds: number[] }`                                            |
| PUT        | `/tiers/:id`                           | Substitui limite e cadeia (a ordem do array é a ordem do fluxo)                                              |
| DELETE     | `/tiers/:id`                           | Remove faixa                                                                                                 |
| GET        | `/sites/:id/chain-preview?totalCents=` | Qual faixa e cadeia um total teria (usado no formulário)                                                     |
| GET        | `/orders?status=&siteId=&awaiting=me`  | Lista pedidos. `awaiting=me` = pedidos cuja etapa atual é do `X-User-Id`                                     |
| GET        | `/orders/stats?siteId=`                | Resumo: pendentes, aguardando o `X-User-Id`, parados e aprovados no mês                                      |
| GET        | `/dashboard?siteId=`                   | Painel: orçamento, aprovado, em aprovação, disponível, série de 6 meses, top fornecedores, obras e atividade |
| GET        | `/orders/:id`                          | Detalhe com itens, cadeia, histórico e vínculo de reenvio                                                    |
| POST       | `/orders`                              | Cria pedido (`X-User-Id` = solicitante). `resubmissionOfId` opcional liga a correção ao rejeitado            |
| POST       | `/orders/:id/approve`                  | Aprova a etapa atual (`X-User-Id` = aprovador da vez)                                                        |
| POST       | `/orders/:id/reject`                   | Rejeita `{ reason }` (obrigatório, mín. 5 caracteres)                                                        |

### Exemplos

```bash
# criar pedido como Pedro (id 1)
curl -X POST localhost:3333/api/orders -H 'content-type: application/json' -H 'x-user-id: 1' -d '{
  "siteId": 1, "supplierId": 2, "orderDate": "2026-10-23", "notes": "Laje do 5º pavimento",
  "items": [
    { "description": "Concreto usinado fck 30", "quantity": "18", "unit": "m³", "unitPriceCents": 54500 },
    { "description": "Taxa de bombeamento", "quantity": "1", "unit": "vb", "unitPriceCents": 185000 }
  ]
}'
# -> 201, totalCents: 1166000, steps: [João PENDING, Amanda WAITING]

# aprovar como João (id 2), depois como Amanda (id 3)
# o seed completo cria 21 pedidos, então o novo é o 22 (sem o histórico seria o 9)
curl -X POST localhost:3333/api/orders/22/approve -H 'x-user-id: 2'
curl -X POST localhost:3333/api/orders/22/approve -H 'x-user-id: 3'

# rejeitar
curl -X POST localhost:3333/api/orders/3/reject -H 'content-type: application/json' -H 'x-user-id: 2' \
  -d '{ "reason": "Cotação acima do contrato vigente" }'

# criar faixa sem teto na OB-102
curl -X POST localhost:3333/api/sites/2/tiers -H 'content-type: application/json' \
  -d '{ "upToCents": null, "approverIds": [6, 4, 5] }'
```

Resposta resumida de `GET /orders/:id`:

```json
{
  "id": 2,
  "code": "PC-00002",
  "status": "PENDING",
  "currentStep": 1,
  "totalCents": 1830495,
  "site": { "id": 1, "code": "OB-101", "name": "Residencial Mirante do Vale" },
  "supplier": { "id": 1, "name": "Aço Forte Distribuidora Ltda", "cnpj": "12345678000190" },
  "orderDate": "2026-10-21",
  "itemCount": 2,
  "tierUpToCents": 10000000,
  "waitingSince": "2026-10-24T21:26:00.000Z",
  "stalled": true,
  "resubmissionOf": null,
  "resubmissions": [],
  "steps": [
    {
      "position": 0,
      "status": "APPROVED",
      "decidedAt": "2026-10-23T03:52:10.000Z",
      "reason": null,
      "approver": { "id": 2, "name": "João Menezes", "role": "Engenheiro residente" }
    },
    {
      "position": 1,
      "status": "PENDING",
      "decidedAt": null,
      "reason": null,
      "approver": { "id": 3, "name": "Amanda Ribeiro", "role": "Gerente de obras" }
    }
  ],
  "items": [
    {
      "position": 0,
      "description": "Vergalhão CA-50 10 mm",
      "quantity": "320",
      "unit": "un",
      "unitPriceCents": 5480,
      "totalCents": 1753600
    }
  ],
  "history": [
    { "type": "CREATED", "actor": { "id": 1, "name": "Pedro Santana" } },
    { "type": "APPROVED", "actor": { "id": 2, "name": "João Menezes" } }
  ]
}
```

### Códigos de erro

| HTTP | `code`                                                  | Quando                                                                                    |
| ---- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 400  | `VALIDATION_ERROR`                                      | Payload inválido (campo obrigatório, quantidade/preço inválidos, sem itens, motivo vazio) |
| 400  | `BAD_REQUEST`                                           | Erro do próprio Fastify, como JSON malformado ou corpo grande demais                      |
| 401  | `NO_ACTOR`                                              | Ação sem `X-User-Id` válido                                                               |
| 403  | `NOT_IN_CHAIN`                                          | Quem tentou decidir não faz parte da cadeia do pedido                                     |
| 403  | `SELF_APPROVAL`                                         | Quem cadastrou tentou decidir o próprio pedido (segunda trava, a criação já impede)       |
| 404  | `NOT_FOUND`                                             | Pedido, faixa ou obra que não existe                                                      |
| 409  | `OUT_OF_ORDER`                                          | Está na cadeia, mas a vez é de outra pessoa antes                                         |
| 409  | `ALREADY_DECIDED`                                       | Já decidiu a própria etapa                                                                |
| 409  | `ORDER_CLOSED`                                          | Pedido já aprovado ou rejeitado                                                           |
| 409  | `STALE_ORDER`                                           | Outra decisão mudou o pedido no meio do caminho                                           |
| 409  | `TIER_LIMIT_TAKEN` / `OPEN_TIER_EXISTS`                 | Limite repetido ou segunda faixa sem teto na mesma obra                                   |
| 409  | `DUPLICATE`                                             | Violação de índice único em outro cadastro (e-mail, código da obra...)                    |
| 422  | `NO_APPLICABLE_TIER`                                    | Nenhuma faixa da obra cobre o total do pedido                                             |
| 422  | `REQUESTER_IN_CHAIN`                                    | Quem está cadastrando é aprovador da faixa em que o pedido cairia                         |
| 422  | `INVALID_RESUBMISSION`                                  | `resubmissionOfId` aponta para pedido que não foi rejeitado                               |
| 422  | `UNKNOWN_SITE` / `UNKNOWN_SUPPLIER` / `UNKNOWN_APPROVER` | O id enviado de obra, fornecedor ou aprovador não existe                                  |
| 422  | `TOTAL_TOO_LARGE`                                       | O total passa do máximo aceito (R$ 1 trilhão)                                             |
| 500  | `INTERNAL`                                              | Erro inesperado, logado no servidor                                                       |

---

## Decisões técnicas

### Tecnologias

| Camada         | Escolha                                | Por quê                                                                                                                                                                   |
| -------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Linguagem      | TypeScript nos dois lados              | Um idioma só no projeto e tipos conferidos de ponta a ponta.                                                                                                              |
| API            | Fastify 5                              | Leve e com `inject()`, que testa rota sem subir servidor.                                                                                                                 |
| Validação      | Zod                                    | O schema valida e já transforma a entrada (`"2,5"` vira milésimos), e as mensagens em português chegam prontas para o front.                                              |
| Banco          | SQLite via better-sqlite3              | Roda local sem instalar nada, como o enunciado pede. Tem transações síncronas e índices parciais, e os dois ajudam aqui (ver consistência).                               |
| ORM            | Drizzle                                | Schema em TypeScript, migrações em SQL versionadas (`server/drizzle/`) e SQL legível. Fica perto do banco.                                                                |
| Front          | React 19 + Vite                        | Conheço bem e o build é rápido.                                                                                                                                           |
| Dados no front | TanStack Query                         | Cache, loading/erro/retry e invalidação depois das mutações, sem montar estado global na mão.                                                                             |
| Estilo         | CSS próprio com tokens (variáveis)     | Queria um visual com cara de ERP de obra (Plus Jakarta Sans com algarismos tabulares nos valores, IBM Plex Mono só nos códigos), sem template e sem lib de componentes.   |
| Testes         | Vitest + Playwright                    | Vitest para domínio, API (via `inject`) e lógica do front. Playwright para os fluxos no navegador, em desktop e celular.                                                  |
| Documentação   | OpenAPI 3 + Swagger UI                 | Contrato navegável em `/api/docs`, com os corpos de requisição gerados dos schemas Zod.                                                                                   |

Comecei com Prisma e troquei pelo Drizzle. O Prisma baixa binários do motor na instalação, o que pode falhar em rede restrita e é mais uma coisa para dar errado na máquina de quem avalia. O better-sqlite3 tem binários pré-compilados para Windows, macOS e Linux.

### Como modelei a regra de alçada

```
sites ──< approval_tiers ──< tier_approvers >── users          (a regra configurável)
  │
  └──< purchase_orders ──< order_items                          (o pedido)
              ├──< approval_steps >── users                     (a cadeia DESTE pedido)
              └──< order_events                                 (histórico append-only)
```

A faixa (`approval_tiers`) pertence a uma obra e guarda só o teto (`up_to_cents`, inclusivo). `NULL` quer dizer "sem teto", a faixa "acima de". Não guardo o piso: ele é o teto da faixa anterior + 1 centavo. Assim não existem buracos nem sobreposição entre faixas por construção, e não há dois campos que precisem concordar entre si.

Os aprovadores da faixa (`tier_approvers`) são uma lista ordenada por `position`. Reordenar é mandar o array na nova ordem: o `PUT /tiers/:id` substitui a cadeia inteira numa transação.

Para escolher a faixa (`server/src/domain/tiers.ts`, função pura e testada) ordeno as faixas pelo teto e pego a primeira cujo teto comporta o total. A faixa sem teto fica por último.

Preferi copiar a cadeia para o pedido (`approval_steps`) a consultar a regra depois. Na criação, os aprovadores da faixa são copiados com `position` e status (`PENDING` para o primeiro, `WAITING` para os demais), e o pedido guarda também o teto da faixa usada (`tier_up_to_cents`). Editar ou remover a regra depois não muda pedidos já criados: quem pediu sob uma regra é aprovado sob essa regra.

A etapa atual fica gravada em `purchase_orders.current_step`. A lista "Aguardando você" e o filtro de pendentes saem do banco, em vez de serem recalculados no front.

Sobre segregação de funções: se quem cadastra é aprovador da faixa em que o pedido cairia, a criação é recusada (`REQUESTER_IN_CHAIN`). Sem isso a pessoa aprovaria o próprio gasto. A decisão ainda confere o `requester_id` como segunda trava.

A decisão (`server/src/modules/orders/service.ts`, função `decide`) confere se quem age é o aprovador da etapa atual. Aprovar avança `current_step`, ou fecha o pedido como `APPROVED` na última etapa. Rejeitar fecha como `REJECTED`, grava o motivo na etapa, marca as etapas seguintes como `CANCELED` e registra o evento. Cada situação inválida (fora da ordem, já decidiu, fora da cadeia, pedido encerrado) tem seu erro, com mensagem dizendo de quem é a vez.

Sobre o enunciado: o exemplo do texto (até R$ 10 mil, João; acima, João e depois Amanda) e a tabela da tela 3 (faixa → lista ordenada de aprovadores) cabem no mesmo modelo, em que cada faixa define a cadeia completa. Interpretei assim porque deixa a configuração explícita ("acima de 100 mil passa por João, Amanda e Ricardo") em vez de uma regra implícita de acumular níveis.

### Prazo, lembrete e reenvio

O backend calcula `waitingSince` (a última decisão ou, se ninguém decidiu, a criação) e marca `stalled` a partir de 3 dias. Não virou coluna porque é derivado do histórico e ficaria desatualizado.

Para o lembrete, quem não é o aprovador da vez vê no detalhe um link `wa.me` com a mensagem pronta (pedido, valor, obra, há quanto tempo espera e o link). Em obra a cobrança acontece no WhatsApp, então o sistema só tira o trabalho de digitar.

Rejeitar encerra o fluxo, mas não precisa obrigar ninguém a redigitar tudo. Por isso o pedido rejeitado vira ponto de partida de um novo (`resubmission_of_id`), que passa pela alçada do zero. Os dois ficam ligados nos dois sentidos, e a trilha de auditoria continua completa.

### Valor sem regra aplicável

Se nenhuma faixa da obra cobre o total, o pedido não é criado (`422 NO_APPLICABLE_TIER`). Aprovar automaticamente seria perigoso, e mandar para "alguém padrão" esconderia um erro de configuração. Na interface isso aparece antes do envio:

- o formulário consulta a prévia da cadeia enquanto a pessoa digita e, sem regra, desabilita o botão com uma mensagem e um link para configurar a obra;
- a tela de regras avisa quando a obra não tem faixa sem teto (valores acima do maior limite ficam descobertos), e o simulador mostra o que aconteceria com um valor qualquer;
- a OB-102 e a OB-103 vêm configuradas assim de propósito, para mostrar os dois casos.

### Demo online

O `npm run build:vercel` (`deploy/build-vercel.mjs`) monta a saída no formato Build Output da Vercel: o front estático e a API como uma função Node, com o SQLite em `/tmp`. Cada instância nova da função cria o banco a partir do seed, então a demo volta ao estado inicial de tempos em tempos. Serve de vitrine. Em produção o banco seria um Postgres gerenciado (ver abaixo).

### Como o front fala com o back

É HTTP/JSON. Em desenvolvimento o Vite faz proxy de `/api` para a porta 3333, então não há CORS nem URL fixa no front.

O `web/src/api/client.ts` é um `fetch` fino: coloca o `X-User-Id`, converte a resposta de erro em `ApiError` (com `code` e `details`) e trata "servidor fora do ar" como status 0. O `web/src/api/hooks.ts` concentra as queries e mutações do TanStack Query. Depois de aprovar, rejeitar ou mexer numa faixa, o hook atualiza o cache com a resposta e invalida as listas afetadas, então lista, contador da barra lateral e detalhe ficam coerentes sem recarregar a página.

O front valida para dar resposta imediata, mas a fonte da verdade é o backend: ele recalcula todos os totais, escolhe a faixa e valida tudo de novo. Os erros de validação do servidor voltam com o caminho do campo e aparecem no campo certo.

### Consistência e integridade

1. Transações. Criar pedido (cabeçalho, itens, cadeia e evento), decidir (pedido, etapas e evento) e salvar faixa (faixa e aprovadores) rodam cada um numa transação `BEGIN IMMEDIATE`. Ou grava tudo, ou nada.
2. Compare-and-set na decisão. O `UPDATE` do pedido só acontece `WHERE status = 'PENDING' AND current_step = <etapa lida>`. Se outra decisão chegou antes, nenhuma linha muda e a API responde `409 STALE_ORDER`. É isso que impede aprovação dupla ou fora de ordem com duas requisições simultâneas.
3. Restrições no próprio banco, para que nem um bug nem um acesso direto deixem dados incoerentes:
   - chaves estrangeiras ligadas (`PRAGMA foreign_keys = ON`, que no SQLite vem desligado);
   - `CHECK` de status válidos, quantidade > 0, preço e total ≥ 0, teto > 0;
   - `CHECK` de coerência: pedido `PENDING` tem etapa atual, pedido encerrado não tem;
   - `CHECK` de que etapa `REJECTED` tem motivo não vazio;
   - índices únicos para posição na cadeia, mesmo aprovador duas vezes na faixa e teto repetido na obra, mais um índice único parcial que deixa uma só faixa sem teto por obra (um `UNIQUE` comum aceitaria vários `NULL`).

   Tem testes que tentam violar essas regras direto no SQL e conferem que o banco recusa.
4. Dinheiro sem float. Centavos e milésimos inteiros. A conta `quantidade × preço` é feita em BigInt e arredondada ao centavo uma vez por item, e o total do pedido é a soma dos itens já arredondados, calculada no servidor.
5. Histórico append-only. O `order_events` só recebe `INSERT`. Guardo separados o estado atual (etapas) e o histórico (eventos): um responde "onde está", o outro "o que aconteceu".
6. Leituras consistentes. O detalhe do pedido sai de uma consulta relacional só, e as respostas das mutações já devolvem o pedido atualizado, então o front nunca mostra um estado intermediário.

### Decisões de produto e interface

Mostro a cadeia antes do envio. Quem compra vê quem vai aprovar e em quantas etapas, o que evita surpresa e pedido parado.

Quando a pessoa não pode agir, o sistema explica em vez de esconder o botão. A barra de decisão diz "Aguardando João (etapa 1 de 3). Sua etapa é a 2", "Você já aprovou" ou "Cadeia concluída", e o botão "Cadastrar pedido" lista o que falta para ser liberado.

"Aguardando você" é a aba padrão das aprovações, com contador na navegação, porque é a pergunta que um aprovador abre o sistema para responder. Já o painel de compras é a tela inicial: quem administra obra quer saber primeiro quanto já gastou e quanto ainda pode gastar. Ele cruza os pedidos com o orçamento de cada obra e mostra o gasto aprovado (cadeia concluída), o valor em aprovação, quanto sobra, o gasto por mês (contado na data da última aprovação, que é quando o dinheiro fica comprometido), os maiores fornecedores e a atividade recente. Obra com 85% ou mais do orçamento comprometido ganha o aviso "Perto do limite". Tudo vem de `GET /dashboard`, calculado no back, e a chave do React Query começa com `orders`, então aprovar um pedido atualiza o painel junto.

Os gráficos do painel são SVG feito à mão (`web/src/components/charts.tsx`): linha, anel, barras e barra de orçamento. São quatro gráficos simples que precisam seguir os tokens de cor nos dois temas, e uma lib de gráficos pesaria mais que o app inteiro. As barras mostram o valor ao passar o mouse ou focar pelo teclado, e cada gráfico tem rótulo acessível.

No cadastro, o resumo mostra quanto do orçamento da obra já está comprometido e quanto fica com este pedido. Passar do orçamento avisa, mas não bloqueia, porque quem decide é a alçada.

A aprovação em lote dá checkbox só aos pedidos que estão na etapa de quem está atuando. "Aprovar selecionados" pede confirmação com a lista e o total, e aprova um por vez pela mesma rota da aprovação individual, então as regras do backend valem para cada um. A rejeição continua individual, porque exige motivo.

Os quatro cards do topo das aprovações levam à aba correspondente e acompanham o filtro de obra. As abas mostram a contagem.

Outras decisões menores:

- Rejeitar é um passo deliberado: dialog nativo (`<dialog>` com `showModal`, que prende o foco e fecha com Esc), motivo obrigatório e aviso de que o fluxo será encerrado.
- Remover uma faixa mostra a consequência ("novos pedidos nesse valor passam para a faixa de Beatriz → Carla" ou "ficarão sem regra").
- A entrada de valores é no jeito brasileiro (`1.234,56`, `2,5`), e os números usam fonte mono tabular para as colunas alinharem.
- Todo estado tem tratamento: skeleton em toda lista, empty state com próxima ação, erro com "Tentar novamente" e validação por campo só depois da interação (sem gritar erro em campo que a pessoa nem tocou), com `aria-invalid` e `aria-describedby`.
- Visual: fundo de papel quente, cards arredondados sem borda, um card de destaque no laranja da marca e botões em pílula. O laranja é destaque e atenção, e verde e vermelho só aparecem com significado (aprovado, rejeitado). As listas que pedem comparação (aprovações, itens, alçada do pedido) continuam em tabela.
- O tema escuro é feito só com tokens (`web/src/styles/base.css`): o tema troca valores, nunca regras. Segue o sistema por padrão, e um script no `index.html` aplica a escolha salva antes do primeiro paint, para não piscar.
- Responsivo: a tabela usa container query e empilha as colunas quando falta espaço (inclusive com o painel de detalhe aberto ao lado). O detalhe vira gaveta em telas médias e tela cheia no celular.

### O que mudaria em produção

- Autenticação de verdade (OIDC/JWT) no lugar do `X-User-Id`, e autorização: só quem administra a obra edita regras.
- PostgreSQL no lugar do SQLite, com `SELECT ... FOR UPDATE` ou a mesma checagem de versão, e as migrações rodando no deploy em vez de na subida da API.
- Versionar as regras (histórico de quem mudou cada faixa e quando), em vez de só ter o retrato no pedido.
- Regras mais ricas, que provavelmente aparecem no uso real: por categoria de compra, por centro de custo, aprovação em paralelo ("qualquer um de"), substituto em férias, escalonamento automático de pedido parado.
- Notificações automáticas (API oficial do WhatsApp Business ou e-mail) quando o pedido chega na vez de alguém, no lugar do link manual de hoje.
- Idempotência no `POST /orders` (header `Idempotency-Key`), para não duplicar pedido num clique duplo com rede ruim.
- Paginação e busca na lista de pedidos, que hoje traz tudo.
- Observabilidade: logs estruturados com id de requisição, métricas de tempo até a aprovação e alertas de erro.
- CI rodando typecheck, testes e E2E a cada PR.

---

## Estrutura

```
server/
  drizzle/                 migrações SQL geradas
  src/
    db/                    schema, conexão, seed e reset
    domain/tiers.ts        regra de escolha de faixa (função pura)
    lib/                   erros, quantidade/dinheiro, header de quem age
    modules/
      catalog.ts           usuários, obras, fornecedores, unidades
      tiers.ts             CRUD de faixas e prévia de cadeia
      orders/              schemas, serviço (criar/decidir), DTOs e rotas
      dashboard.ts         painel: gasto x orçamento, meses, fornecedores, atividade
    app.ts                 Fastify + tratamento de erro padronizado
    openapi.ts             contrato OpenAPI + Swagger UI em /api/docs
  test/                    domínio, pedidos/aprovação, faixas/integridade, painel
web/
  src/
    api/                   cliente HTTP, tipos e hooks do TanStack Query
    components/            cadeia, estados, dialog, ações de decisão, gráficos SVG...
    pages/                 Dashboard, NewOrder, Approvals, Rules (+ validação do pedido)
    lib/                   formatação BR, "atuando como", tema, link do WhatsApp
    styles/                tokens (claro e escuro) e CSS por tela
    author.ts              quem fez (card da barra lateral)
e2e/                       testes Playwright (desktop e celular)
deploy/                    empacotamento da demo para a Vercel
docs/screenshots/          imagens deste README
playwright.config.ts       sobe API e front de teste para o E2E
vercel.json                configuração do build da demo
```
