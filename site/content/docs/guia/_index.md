---
title: Guia
weight: 3
prev: /docs/getting-started
next: /docs/guia/tecnologias
---

As decisões técnicas da entrega — os cinco pontos que o `README.md` precisa responder.

{{< cards >}}
  {{< card link="tecnologias" title="Tecnologias e motivos" icon="chip" subtitle="O que foi escolhido para front, back, banco e testes — e por quê." >}}
  {{< card link="alcada" title="Modelagem da alçada" icon="scale" subtitle="Como a regra é modelada, calculada e persistida." >}}
  {{< card link="comunicacao" title="Front-end ↔ back-end" icon="switch-horizontal" subtitle="Contrato, transporte, tratamento de erro e estados." >}}
  {{< card link="consistencia" title="Consistência e integridade" icon="shield-check" subtitle="Transações, constraints e validação em camadas." >}}
  {{< card link="producao" title="O que mudaria em produção" icon="server" subtitle="O que foi simplificado de propósito e o caminho real." >}}
{{< /cards >}}

{{< callout type="info" >}}
Os quatro diagramas do sistema estão distribuídos pelas páginas: entidades e estados em [Modelagem da alçada](alcada), operações por camada em [Front-end ↔ back-end](comunicacao) e o fluxo de submissão e decisão em [Consistência e integridade](consistencia).
{{< /callout >}}
