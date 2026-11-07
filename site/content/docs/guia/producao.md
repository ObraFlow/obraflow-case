---
title: O que mudaria em produção
weight: 5
prev: /docs/guia/consistencia
next: /docs/escopo/
---

{{< callout type="info" >}}
Este conteúdo é o mesmo do [`README.md`](https://github.com/Carolbalbs/obraflow-case/blob/resolucao-obraflow/docs/README.md) da entrega, que continua sendo a referência exigida pelo enunciado.
{{< /callout >}}

O que está aqui é o recorte do case executando local. O que mudaria, e por quê:

1. **Autenticação de verdade.** `DEMO_MODE` sai, e com ela a entrada sem senha. A sessão passa a
   ser emitida por um provedor (OIDC/SSO corporativo), com refresh e expiração curta. O resto do
   código **não muda**: `lerSessao(req)` já é o único lugar que decide quem é quem, e a matriz de
   permissão já cobra do servidor.
2. **Postgres no lugar do SQLite.** A troca é de `datasource` e adapter — o domínio não sabe qual
   banco existe. Mas há um ponto que exige atenção: o `UPDATE` condicional da decisão depende de
   atomicidade de linha, que o Postgres dá, e o isolamento passa a precisar de teste explícito
   sob concorrência real (o SQLite serializa as escritas e esconde o caso de duas transações
   lendo o mesmo estado).
3. **Trilha de auditoria imutável.** Hoje a história está nas `Etapa`, que são linhas atualizáveis.
   Em produção, um log append-only de eventos (`PedidoSubmetido`, `EtapaDecidida`) ao lado do
   estado — porque auditoria que pode ser editada pelo mesmo `UPDATE` que escreve o estado não é
   auditoria.
4. **Notificação ao aprovador da vez.** É o que falta para a cadeia andar sozinha: e-mail ou push
   quando a etapa se torna a sua, com digest para quem acumula fila. Fora do case por exigir
   serviço externo.
5. **Atualização ao vivo da fila.** Dois aprovadores na mesma tela hoje só descobrem a decisão do
   outro ao recarregar. SSE ou WebSocket resolveriam — o `409` já protege o dado, o que falta é
   conforto.
6. **Concorrência na edição da faixa.** Dois `PUT` simultâneos na mesma faixa: o último escreve.
   Produção pediria versão otimista (`If-Match` / coluna `versao`), como a decisão já tem.
7. **Observabilidade.** Log estruturado com id de correlação, métrica de tempo por etapa (onde a
   cadeia trava), alerta de pedido parado. Hoje não há nada disso.
8. **Paginação por cursor** na lista, no lugar de `page`/`perPage` por `OFFSET`, que degrada com
   volume.
9. **O que continuaria igual, e é de propósito:** o domínio puro e sem dependência de framework, o
   snapshot da cadeia, o dinheiro inteiro e o envelope único de erro. São as decisões que não
   mudam de resposta quando o sistema cresce.
