# Plano de entrega do ObraFlow

Este conjunto de documentos organiza a implementação antes do código. O enunciado original permanece no README da raiz.

## Documentos

- [Plano de produto e features](./delivery-plan.md): prioridades, branches, dependências, critérios de aceite, testes e cronograma.
- [Decisões de arquitetura e negócio](./decisions.md): escolhas, custos, limites do sistema e evolução.
- [Colaboração, agentes e skills](./collaboration.md): responsabilidades, contratos de trabalho, revisão e integração.
- [Contrato de negócio e modelo](./domain-contract.md): invariantes, limites, estados, transações e cenários de fronteira.
- [Contrato HTTP](./api-contract.md): endpoints, exemplos, erros, paginação e idempotência.
- [Fluxos e rascunhos das telas](./product-flows.md): navegação, wireframes textuais, estados e critérios de experiência.
- [Desenvolvimento e operação](./development.md): execução com Docker/Node, seed, migrations, testes e diagnóstico.

## Estado real

F00 especificada em 20/10/2026: contratos de negócio e HTTP definidos, modelo inicial e rascunhos textuais das três telas preparados. A branch local desta etapa é `docs/product-contracts`; as demais continuam propostas.

F01 implementada na branch local `chore/foundation`: aplicação mínima Next.js, PostgreSQL, Prisma, migration inicial, seed, configuração de CI e testes de fundação. As APIs e telas de negócio ainda não estão implementadas; seus exemplos continuam sendo contratos futuros. As skills personalizadas permanecem propostas.

Verificações locais da F01: lint, tipos, 11 testes unitários, 4 testes de integração com PostgreSQL dedicado, build de produção e smoke HTTP da aplicação em Docker. A configuração de CI foi preparada, mas não executada remotamente. O próximo marco é F02. Alterações de comportamento exigem atualizar decisões, critérios e testes relacionados.
