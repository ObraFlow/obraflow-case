---
title: Modelagem da alçada
weight: 2
prev: /docs/guia/tecnologias
next: /docs/guia/comunicacao
---

{{< callout type="info" >}}
Este conteúdo é o mesmo do [`README.md`](https://github.com/Carolbalbs/obraflow-case/blob/resolucao-obraflow/docs/README.md) da entrega, que continua sendo a referência exigida pelo enunciado.
{{< /callout >}}

**Modelada.** Uma `Faixa` guarda **apenas o limite superior**, e ele é **inclusivo**:

```prisma
model Faixa {
  id             String @id
  obraId         String
  limiteCentavos Int?              // nulo = faixa aberta, sem teto
  aprovadores    FaixaAprovador[]  // @@unique([faixaId, ordem])
}
```

Não há coluna de valor mínimo. O mínimo é **derivado**: é o limite da faixa anterior mais um
centavo, e a tela o mostra recalculado. A ausência é a invariante — sem um mínimo editável à
parte, **buraco e sobreposição entre faixas deixam de ser representáveis**. Não existe estado
inválido a validar, porque não existe forma de escrevê-lo
([ADR 0002](https://github.com/Carolbalbs/obraflow-case/blob/resolucao-obraflow/docs/adr/0002-faixa-por-limite-superior.md)).

A ordem dos aprovadores é coluna, com índice único `(faixaId, ordem)`: duas pessoas na mesma
posição são impossíveis no banco, não só improváveis no código.

**Calculada.** A faixa aplicável sai do **total do pedido**, nunca do valor de um item isolado. A
regra inteira cabe em duas funções puras de `src/domain/`:

```ts
// src/domain/alcada.ts — o limite superior é inclusivo. Esta linha é a regra.
export function comporta(faixa: Faixa, total: Centavos): boolean {
  return faixa.limiteCentavos === null || total <= faixa.limiteCentavos
}
```

`resolverFaixa` ordena as faixas pelo limite (a aberta sempre por último) e devolve a primeira que
comporta o total — ou falha com `SEM_REGRA_APLICAVEL`, que é **estado tratado e não erro
genérico**: a submissão é bloqueada com mensagem própria e o rascunho continua existindo para ser
corrigido. `montarCadeia` então transforma os aprovadores da faixa em etapas numeradas.

**Persistida.** O instante em que isso acontece é a **submissão**, uma vez só, e o resultado é
gravado como **snapshot** ([ADR 0001](https://github.com/Carolbalbs/obraflow-case/blob/resolucao-obraflow/docs/adr/0001-cadeia-de-aprovacao-e-snapshot.md)):

- as `Etapa` do pedido, com `(pedidoId, ordem)` único e o `usuarioId` de quem assina;
- três colunas no próprio pedido — `faixaId`, `faixaLimiteCentavos`, `faixaSemTeto`.

`faixaId` é `onDelete: SetNull`, e as outras duas são do pedido. **Apagar a faixa não reescreve o
histórico**: é o pedido `#1008` do seed, com `faixaId` nulo e o limite de R$ 20.000,00 ainda
visível. **Editar a faixa também não**: é o `#1007`, cuja cadeia gravada (João) difere da faixa
atual da obra (Amanda). Nenhuma leitura recalcula coisa alguma — `src/domain/cadeia.ts` sequer
recebe a alçada como parâmetro, para que recalcular não seja possível por distração.

O rascunho **não** tem cadeia, de propósito: o total ainda vai mudar, e resolver a faixa ali
gravaria uma decisão derivada de um número provisório.

## Valor sem regra aplicável

É **estado tratado, não erro genérico**: `resolverFaixa` falha com `SEM_REGRA_APLICAVEL`, a submissão responde `422` com mensagem própria, e o **rascunho continua existindo** para ser corrigido. A tela avisa antes mesmo do envio quando a obra escolhida não tem faixa nenhuma, e oferece o atalho para a tela de regras. No seed, a obra **Galpão Logístico Norte** tem faixa só até R$ 5.000,00 e nenhuma faixa aberta — é assim que o estado fica alcançável sem preparar nada (veja [Dados de demonstração](/tutoriais/dados-demo)).

## Diagramas

Os diagramas saem de um canvas feito no planejamento e foram **corrigidos contra o código**: os nomes de função são os de `src/domain` e `src/server`, e os campos, os de `prisma/schema.prisma`.

### Entidades

As oito tabelas, as relações com a regra de exclusão de cada uma (cascade, restrict ou set null) e, em cada caixa, as funções puras que aplicam a regra sobre ela.

![Diagrama de entidades](/diagramas/entidades.png)

### Estados do pedido

Rascunho, pendente, aprovado e rejeitado, e o que cada passagem exige.

![Estados do pedido](/diagramas/estados-do-pedido.png)

{{< callout type="info" >}}
O enunciado deste ponto está em [Escopo → Regra de alçada](/docs/escopo/regra-de-alcada).
{{< /callout >}}
