---
title: Regra de alçada
weight: 1
prev: /docs/escopo/
next: /docs/escopo/backend
---

O ObraFlow tem um **serviço de aprovações**. Ele gerencia **alçadas de aprovação**:
regras que definem **quem** pode autorizar uma decisão e **em qual ordem**, de acordo com
a **obra** e o **valor total da compra**.

## Por que alçadas existem

A gestão de alçadas mantém o controle financeiro e operacional da empresa. Compras de menor
impacto podem ser decididas por responsáveis próximos à obra; compras de maior valor exigem
revisão de pessoas com maior responsabilidade. Isso reduz o risco de gastos indevidos, evita
que uma única pessoa aprove decisões além de sua responsabilidade e cria uma **trilha
auditável** de quem aprovou ou rejeitou cada pedido.

## Comportamento esperado

- A regra aplicável é identificada **no momento da criação do pedido**.
- A cadeia de aprovadores é formada nesse momento e **persistida**.
- O fluxo só avança para a próxima pessoa **depois da aprovação anterior**.
- Em caso de **rejeição**, o fluxo é interrompido e o **motivo fica registrado no histórico**.
- As regras são **configuráveis por obra**: projetos diferentes têm orçamentos, portes e
  responsáveis distintos.

## Exemplo de regra

```text
Obra 1 — valor até R$ 10.000,00
-> Aprovadores: João
Obra 1 — valor acima de R$ 10.000,00
-> Aprovadores: Amanda
```

{{< tabs >}}

  {{< tab name="R$ 8.000,00" >}}
  **Abaixo da faixa.** Basta a decisão de João para o pedido ser aprovado — a cadeia tem
  uma única etapa.
  {{< /tab >}}

  {{< tab name="R$ 12.500,00" >}}
  **Acima da faixa.** João aprova primeiro. Só depois da aprovação dele é que o pedido
  fica liberado para Amanda decidir.
  {{< /tab >}}

  {{< tab name="Rejeição" >}}
  **Em qualquer etapa.** Se João ou Amanda rejeitar, o pedido é cancelado na hora e o
  **motivo é obrigatório** — ele fica no histórico.
  {{< /tab >}}

{{< /tabs >}}

## O que define a faixa

{{< callout type="important" >}}
A alçada é determinada pelo **valor total do pedido** (`Σ total_item`), nunca pelo valor
isolado de um item.
{{< /callout >}}

## Valores sem regra aplicável

O comportamento para um valor que **não cai em nenhuma faixa** precisa ser **definido e
documentado** por você — por exemplo, impedir o envio do pedido com mensagem clara. Isso
vale tanto no [servidor](/docs/escopo/backend) quanto na [interface](/docs/escopo/frontend), e é item do
[checklist do README](/docs/entrega/readme).

## Como o serviço resolveu

{{< callout type="info" >}}
A regra é resolvida na **submissão** do pedido, não na criação do rascunho: o rascunho é
incompleto por natureza e o total ainda vai mudar. Na submissão a faixa é escolhida pelo total
(limite superior **inclusivo**) e a cadeia é gravada como **snapshot** — editar ou apagar a faixa
depois não reescreve pedido em andamento. Detalhes em [Modelagem da alçada](/docs/guia/alcada).
{{< /callout >}}
