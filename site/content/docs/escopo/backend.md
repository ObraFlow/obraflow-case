---
title: Backend e persistência
weight: 2
prev: /docs/escopo/regra-de-alcada
next: /docs/escopo/frontend
---

Você deve projetar e implementar a **API** (ou outro mecanismo de comunicação entre
front-end e servidor) e a **persistência** necessários para suportar o desafio. O contrato,
as rotas e o formato dos dados são **livres**, desde que atendam aos comportamentos abaixo.

## Requisitos funcionais

- [ ] cadastrar e listar **obras, usuários, fornecedores, pedidos e regras de alçada**;
- [ ] criar pedidos com **cabeçalho e N itens**; calcular e **persistir seus totais**;
- [ ] determinar a **cadeia de aprovadores** conforme a obra e o valor total do pedido;
- [ ] registrar **aprovações e rejeições**, incluindo o **motivo obrigatório** de rejeição;
- [ ] **impedir decisões fora da ordem** da alçada e **preservar o histórico**;
- [ ] criar, editar, remover e consultar **níveis e aprovadores** das regras por obra;
- [ ] garantir a **consistência** das leituras e escritas dos dados.

## Entidades mínimas

| Entidade | Observações |
|---|---|
| Obra | Base da configuração de alçada. |
| Usuário | Candidato a aprovador. |
| Fornecedor | Vinculado ao pedido. |
| Pedido | Cabeçalho: obra, fornecedor, data, observações internas, total calculado. |
| Item do pedido | Descrição, quantidade (decimal positivo), unidade, preço unitário (≥ 0), total calculado. |
| Regra de alçada | Por obra: faixa de valor + aprovadores **ordenados**. |
| Cadeia de aprovação | Instância da regra no pedido: etapas concluídas, etapa atual, próximas. |
| Histórico de decisão | Quem, quando, aprovou/rejeitou, motivo (obrigatório na rejeição). |

## Regras de cálculo

- `total_item = quantidade × preço_unitário` — **não editável diretamente**.
- `total_pedido = Σ total_item` — é o valor que **seleciona a faixa de alçada**.
- A alçada é determinada pelo **valor total do pedido**, nunca pelo valor isolado de um item.

## Estados do pedido

{{< badge content="Pendente" >}} {{< badge content="Aprovado" color="green" >}} {{< badge content="Rejeitado" color="red" >}}

## Validações exigidas (lado servidor)

| Situação | Comportamento esperado |
|---|---|
| Quantidade ou preço unitário inválido, negativo ou não numérico | erro no item correspondente; não persiste |
| Pedido sem itens | erro claro; não persiste |
| Campos obrigatórios vazios (obra, fornecedor, data, descrição de item) | erro no campo correspondente |
| Rejeitar sem motivo | rejeita a requisição |
| Decisão fora da ordem da alçada | bloqueia |
| Cadeia de alçada já concluída | nenhuma decisão adicional aceita |
| Valor sem regra de alçada aplicável | comportamento **definido e documentado** por você (ex.: impedir o envio com mensagem clara) |

## Dados de demonstração

Inclua seed suficiente para avaliar o fluxo:

- ao menos **2 obras**;
- usuários;
- regras de alçada (faixas distintas);
- pedidos em **diferentes estados** (pendente, aprovado, rejeitado).

## Stack

**Livre** — back-end, banco de dados, ORM, testes e infraestrutura a seu critério.
Única exigência: rodar **localmente**, sem serviços pagos nem credenciais externas.
Testes são **desejáveis, não obrigatórios**.

{{< callout type="warning" >}}
Se optar por expor uma API HTTP, o `README.md` precisa documentar os **principais endpoints
e payloads**. Veja o [checklist](/docs/entrega/readme).
{{< /callout >}}

## O que o back-end entrega, critério a critério

Cada requisito acima cruzado com o código que o implementa.

| # | Exigência | | Onde |
|---|---|:---:|---|
| B1 | Cadastrar e listar obras, usuários, fornecedores, pedidos e regras de alçada | ✅ | Pedidos e regras: completo. Listagem por API das outras três: `GET /api/obras` e `GET /api/fornecedores` (sessão, qualquer papel; feature `s5f4`) e `GET /api/usuarios` (atrás de `DEMO_MODE`). **Cadastro**: obras e fornecedores pela tela `/empresa` e por `POST /api/obras` e `POST /api/fornecedores`, só para o admin (feature `s5f5`, depois da entrega); usuários continuam vindo do seed |
| B2 | Pedido com cabeçalho e N itens; calcular e persistir totais | ✅ | Total do item em `dinheiro.ts:77` (`porMilesimos`, arredondamento único), soma em `dinheiro.ts:66`. Itens substituídos e total recalculado numa transação em `api/pedidos/[id]/route.ts:54`. Total enviado pelo cliente é ignorado |
| B3 | Cadeia de aprovadores conforme obra e valor **total** | ✅ | `alcada.ts:76` `resolverFaixa`, limite inclusivo em `alcada.ts:61` `comporta`, cadeia em `cadeia.ts:34` `montarCadeia` |
| B4 | Registrar aprovações e rejeições, com motivo obrigatório | ✅ | Rota `api/pedidos/[id]/decisoes`; motivo validado em `decisao.ts:45` `rejeitar` |
| B5 | Impedir decisão fora de ordem e preservar o histórico | ✅ | UPDATE condicional em `server/decisao.ts:88`; zero linhas afetadas vira 409 em `server/decisao.ts:100`. O histórico é a própria `Etapa` (`decididoEm`, `motivo`) — nada é apagado. Verificado: **409 NAO_E_SUA_VEZ** |
| B6 | Criar, editar, remover e consultar níveis e aprovadores por obra | ✅ | `api/obras/[id]/faixas` (GET, POST) e `api/faixas/[id]` (PUT substitui a faixa inteira, DELETE) |
| B7 | Garantir consistência de leituras e escritas | ✅ | Sete `prisma.$transaction`, incluindo submissão (`submissao/route.ts:58`) e decisão (`server/decisao.ts:63`). Verificado: dois POST simultâneos dão **200 e 409**, com **uma** etapa decidida no banco |
| B8 | Dados de demonstração: ≥2 obras, usuários, regras, pedidos em estados diferentes | ✅ | `prisma/seed.ts`: 3 obras, 6 usuários nos 4 papéis, 4 fornecedores, 3 faixas em 2 obras, 8 pedidos — inclusive faixa editada e faixa apagada depois da submissão |
| B9 | README: iniciar, popular, consumir a API, endpoints e payloads | ✅ | Como rodar, O que o seed cria, tabela de endpoints (todas as rotas de `app/api/`, inclusive `obras`, `fornecedores`, `pedidos/resumo` e `pedidos/painel`) e exemplo `curl` completo a partir de README.md:358. `/admin` descrito em README.md:87 e na tabela de telas de "Onde está cada coisa" |
