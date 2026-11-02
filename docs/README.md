# Plano de entrega do ObraFlow

Este conjunto registra contratos, implementação e evidências. O [enunciado original](./challenge.md) foi preservado separadamente; o README da raiz apresenta a aplicação e sua execução.

## Documentos

- [Plano de produto e features](./delivery-plan.md): prioridades, branches, dependências, critérios de aceite, testes e cronograma.
- [Decisões de arquitetura e negócio](./decisions.md): escolhas, custos, limites do sistema e evolução.
- [Colaboração, agentes e skills](./collaboration.md): responsabilidades, contratos de trabalho, revisão e integração.
- [Contrato de negócio e modelo](./domain-contract.md): invariantes, limites, estados, transações e cenários de fronteira.
- [Contrato HTTP](./api-contract.md): endpoints, exemplos, erros, paginação e idempotência.
- [Fluxos e rascunhos das telas](./product-flows.md): navegação, wireframes textuais, estados e critérios de experiência.
- [Desenvolvimento e operação](./development.md): execução com Docker/Node, seed, migrations, testes e diagnóstico.
- [Verificação da entrega](./verification.md): escopo, checks, cenários e limites da avaliação local.

## Estado real

F00–F08 implementadas e F09 selecionada: fila pessoal, busca por identificador, resumo explícito da página e prévia da cadeia. A branch local de entrega é `feat/obraflow-delivery`, com merges das branches usadas preservados no histórico.

APIs de cadastros, configuração, pedidos e decisões estão implementadas, assim como as três telas, dados de demonstração, migrations e checks. As skills personalizadas continuam propostas; os agentes seguiram os contratos de tarefa e a revisão descritos neste conjunto.

Verificações locais: formatação, lint, tipos, 62 testes unitários, 23 de integração com PostgreSQL e 7 jornadas Chromium, incluindo resposta perdida e responsividade. A configuração de CI foi preparada, sem execução remota nesta entrega. Alterações de comportamento devem atualizar contratos, critérios e testes relacionados.
