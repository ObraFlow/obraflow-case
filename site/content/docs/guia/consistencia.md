---
title: Consistência e integridade
weight: 4
prev: /docs/guia/comunicacao
next: /docs/guia/producao
---

{{< callout type="info" >}}
Este conteúdo é o mesmo do [`README.md`](https://github.com/Carolbalbs/obraflow-case/blob/resolucao-obraflow/docs/README.md) da entrega, que continua sendo a referência exigida pelo enunciado.
{{< /callout >}}

**Dinheiro nunca passa por ponto flutuante.** Centavos (`Int`) e quantidades em milésimos (`Int`),
do schema ao JSON. Nenhuma coluna é `Float` ou `Decimal`. Não é preciosismo: um pedido de
R$ 10.000,00 que vira R$ 9.999,99 **cai em outra faixa e é assinado por outra pessoa**. O
arredondamento acontece uma vez só, sobre o produto inteiro — arredondar antes faria a soma dos
itens divergir do total que o aprovador lê.

**O total é sempre do servidor.** Nenhuma rota lê `totalCentavos` do corpo. Ele é recalculado a
cada escrita, a partir dos itens. Um `curl` enviando um total divergente é simplesmente ignorado.

**Integridade pelo banco, não por boa vontade do código.** `@@unique([faixaId, ordem])`,
`@@unique([pedidoId, ordem])` nos itens e nas etapas, `onDelete: Restrict` onde apagar destruiria
história, `onDelete: Cascade` onde os filhos não fazem sentido sozinhos, `onDelete: SetNull` só
onde a ausência é um estado legítimo — que é o caso da faixa apagada.

**Transações onde o meio do caminho não é um estado observável.** Criar faixa com seus
aprovadores, substituir um pedido inteiro, submeter, decidir: tudo ou nada. A alçada é relida
**dentro** da transação da submissão, porque a faixa pode ter sido apagada entre a leitura e a
escrita — se sumiu, o plano falha e nada foi gravado.

**Concorrência: a decisão é um `UPDATE` condicional**
([ADR 0004](https://github.com/Carolbalbs/obraflow-case/blob/resolucao-obraflow/docs/adr/0004-decisao-por-update-condicional.md)). Não há leitura seguida de escrita
confiando no que leu. O `where` **é** o contrato:

```ts
{
  pedidoId, ordem, usuarioId,          // é esta etapa, e é desta pessoa
  situacao: 'pendente',                // ainda não foi decidida — duplo clique, corrida
  pedido: {
    situacao: 'pendente',              // o pedido não terminou no meio-tempo
    etapas: { none: { ordem: { lt: ordem }, situacao: 'pendente' } },  // nenhuma anterior ficou para trás
  },
}
```

Zero linhas afetadas é a premissa caída, e vira `409` — não um erro a investigar. Isso faz com que
**decisão fora de ordem, duplo clique e corrida sejam o mesmo mecanismo**, e não três checagens
que podem divergir. O bloco 4 do `scripts/verificar.sh` dispara dois `POST` em paralelo e mostra
um `200`, um `409` e **uma única** etapa decidida no banco.

A submissão usa o mesmo recurso, condicionada a `situacao: 'rascunho'`: dois envios simultâneos do
mesmo pedido produzem uma submissão e um `409 PEDIDO_IMUTAVEL`.

**Privacidade do rascunho é cláusula de consulta, não filtro de tela.** O `where` de
`GET /api/pedidos` tem duas famílias — o submetido, que qualquer sessão vê, e o rascunho, que só o
criador vê. Pedir `?situacao=rascunho` como outra pessoa devolve **os rascunhos dela**, nunca os
alheios. É o que torna a regra impossível de esquecer numa tela nova.

**Identidade vem do cookie, e o papel vem do banco.** O cookie carrega só o id; forjá-lo com outro
id faz o servidor responder como *aquele* usuário, com o papel *dele* — e nunca concede poder a
mais. Nenhum cabeçalho declarado pelo cliente participa da decisão.

## Submissão e decisão

Os dois caminhos que mudam um pedido, e onde cada recusa acontece. Os diagramas saem de um canvas feito no planejamento e foram **corrigidos contra o código**: os nomes de função são os de `src/domain` e `src/server`, e os campos, os de `prisma/schema.prisma`.

![Submissão e decisão](/diagramas/submissao-e-decisao.png)

## Testes e verificações

```bash
npx tsc --noEmit    # tipos
npm run lint        # ESLint (next/core-web-vitals + react-hooks)
npm test            # 58 casos
```

A suíte cobre o que só leitura não pega e o que não exige servidor:

| Projeto | Casos | O que afirma |
|---|---:|---|
| `dominio` | 49 | Limite inclusivo, faixa aberta, ordenação, sem regra aplicável, montagem e leitura da cadeia, aprovador da vez, rejeição encerrando o fluxo, arredondamento de centavos e milésimos, schemas (data do pedido obrigatória, preço zero aceito, negativo ou ausente recusado) — e, em 18 desses casos, as derivações do painel: quando cada etapa recebeu a vez, "parado há", KPIs contra o período anterior, cortes por faixa e por aprovador, fila de atenção e série semanal |
| `ui` | 8 | Ancoragem de `error.fields` nos campos do formulário — chaves, nunca textos de mensagem —, inclusive o envio bloqueado sem data |
| `api` | 1 | Guarda de configuração do projeto de rota |

O que **não** é testado por unidade é testado por `curl` contra o servidor de verdade, em
`scripts/verificar.sh`: as recusas 403, 409 e 422 e a corrida de decisão. É deliberado — a corrida
só é real contra o banco de verdade, e um mock dela provaria apenas que o mock foi escrito certo.
