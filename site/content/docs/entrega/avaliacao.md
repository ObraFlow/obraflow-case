---
title: Contato e entrevista
weight: 2
prev: /docs/entrega/readme
---

## Contato

**Ana Carolina Balbino**

{{< cards >}}

  {{< card link="https://wa.me/5571983002588" title="WhatsApp" icon="phone" subtitle="+55 71 98300-2588">}}
  {{< card link="mailto:carolbalbinosilva4@gmail.com" title="E-mail" icon="mail" subtitle="carolbalbinosilva4@gmail.com" >}}
{{< /cards >}}

## As sete decisões registradas

As decisões que o resto do código assume, cada uma num ADR do repositório. São o roteiro natural da entrevista.

| ADR | Assunto | Em uma linha |
|---|---|---|
| [0001](https://github.com/Carolbalbs/obraflow-case/blob/resolucao-obraflow/docs/adr/0001-cadeia-de-aprovacao-e-snapshot.md) | Cadeia é snapshot | Gravada na submissão, nunca recalculada |
| [0002](https://github.com/Carolbalbs/obraflow-case/blob/resolucao-obraflow/docs/adr/0002-faixa-por-limite-superior.md) | Só o limite superior | Buraco e sobreposição deixam de ser representáveis |
| [0003](https://github.com/Carolbalbs/obraflow-case/blob/resolucao-obraflow/docs/adr/0003-route-handlers-sem-server-actions.md) | Route Handlers | O contrato precisa ser inspecionável por `curl` |
| [0004](https://github.com/Carolbalbs/obraflow-case/blob/resolucao-obraflow/docs/adr/0004-decisao-por-update-condicional.md) | `UPDATE` condicional | Fora de ordem, duplo clique e corrida, um mecanismo só |
| [0005](https://github.com/Carolbalbs/obraflow-case/blob/resolucao-obraflow/docs/adr/0005-sessao-de-demonstracao-sem-senha.md) | Sessão sem senha | Atrás de `DEMO_MODE`; desligada, 404 e não 403 |
| [0006](https://github.com/Carolbalbs/obraflow-case/blob/resolucao-obraflow/docs/adr/0006-sem-empresa-no-modelo.md) | Sem `Empresa` | `Obra` é o escopo máximo |
| [0007](https://github.com/Carolbalbs/obraflow-case/blob/resolucao-obraflow/docs/adr/0007-dominio-em-portugues.md) | Domínio em português | O código fala a língua de quem usa o produto |
