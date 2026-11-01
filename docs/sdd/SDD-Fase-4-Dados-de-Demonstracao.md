# SDD — Fase 4: Dados de demonstração

## Objetivo

Fornecer dados reproduzíveis suficientes para avaliar cadastro, regras, aprovações, estados e histórico.

## Dependências

Fases 0, 1, 2 e 3.

## Escopo

- Criar dados locais de demonstração por mecanismo repetível e seguro (por exemplo, perfil/seed idempotente).
- Incluir ao menos duas obras, usuários, regras e pedidos em estados diferentes.
- Cobrir aprovações em níveis distintos, pedido totalmente aprovado, pedido rejeitado com motivo e pedido pendente.
- Documentar como limpar/recriar os dados locais sem afetar ambientes externos.

## Tarefas

- [x] Definir conjunto de demonstração coerente entre obras, fornecedores, aprovadores, faixas e pedidos.
- [x] Implementar carga idempotente ou comando explícito para popular dados de demonstração.
- [x] Incluir pedidos com múltiplos itens e valores que exercitem faixas distintas.
- [x] Verificar que pedido rejeitado tem motivo e histórico; pedido pendente aponta ao aprovador correto.
- [x] Documentar comandos e dados disponíveis no README.

## Critérios de aceite

- [x] A base local pode ser populada seguindo instruções documentadas e sem inserção manual.
- [x] Existem ao menos duas obras, usuários, regras e pedidos em diferentes estados.
- [x] A carga pode ser executada novamente sem duplicação inesperada nem corrupção dos dados.
- [x] Os dados permitem demonstrar criação, progressão, conclusão e rejeição de pedidos.

## Verificação e conclusão

- Verificações executadas: `mise exec java@21.0.2 -- ./mvnw -f backend/pom.xml -Dtest=DemoDataSeederIntegrationTest test`; `mise exec java@21.0.2 -- ./mvnw -f backend/pom.xml test`.
- Resultado: teste específico e suíte backend passaram; 36 testes, 0 falhas, 0 erros e 0 ignorados. O teste de integração confirmou estados, cadeia atual, motivo de rejeição, itens múltiplos e segunda execução sem duplicação.
- [x] Fase concluída e integrada em `obraflow-challenge`.
