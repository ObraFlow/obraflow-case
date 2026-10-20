# Plano de entrega do ObraFlow

Este conjunto de documentos organiza a implementação antes do código. O enunciado original permanece no README da raiz.

## Documentos

- [Plano de produto e features](./delivery-plan.md): prioridades, branches, dependências, critérios de aceite, testes e cronograma.
- [Decisões de arquitetura e negócio](./decisions.md): escolhas, custos, limites do sistema e evolução.
- [Colaboração, agentes e skills](./collaboration.md): responsabilidades, contratos de trabalho, revisão e integração.
- [Contrato de negócio e modelo](./domain-contract.md): invariantes, limites, estados, transações e cenários de fronteira.
- [Contrato HTTP](./api-contract.md): endpoints, exemplos, erros, paginação e idempotência.
- [Fluxos e rascunhos das telas](./product-flows.md): navegação, wireframes textuais, estados e critérios de experiência.

## Estado real

F00 especificada em 20/10/2026: contratos de negócio e HTTP definidos, modelo inicial e rascunhos textuais das três telas preparados. A branch local desta etapa é `docs/product-contracts`; as demais continuam propostas.

Nenhuma aplicação, pipeline, skill personalizada ou ambiente foi implementado. Os exemplos são contratos e cenários futuros, não resultados de testes executáveis. O próximo marco é F01, a fundação executável. Alterações de comportamento exigem atualizar decisões, critérios e testes relacionados.
