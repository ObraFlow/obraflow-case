# SDD — Fase 3: Aprovação e histórico

## Objetivo

Entregar consulta de pedidos e decisões de aprovação/rejeição, preservando a ordem da alçada e o histórico auditável.

## Dependências

Fases 0, 1 e 2.

## Escopo

- Listar pedidos com identificador, obra, fornecedor, data, quantidade de itens, total, estado e progresso da alçada.
- Consultar detalhes com itens, aprovadores concluídos, aprovador atual, próximas etapas e histórico.
- Permitir aprovar/rejeitar apenas a decisão atual da cadeia.
- Exigir e persistir motivo de rejeição; interromper o fluxo ao rejeitar.
- Avançar ao próximo aprovador após aprovação e concluir o pedido quando toda a cadeia aprovar.
- Garantir consistência transacional e proteção contra decisões concorrentes ou repetidas.

## Tarefas

- [x] Escrever testes de domínio para cada transição válida e inválida do fluxo.
- [x] Criar operações e endpoints de consulta, aprovação e rejeição.
- [x] Persistir cada decisão com usuário, resultado, instante e motivo quando rejeitada.
- [x] Garantir atomicidade e concorrência segura; decisão fora de ordem, repetida ou sobre cadeia concluída deve ser rejeitada.
- [x] Escrever testes de integração/API para aprovação simples, aprovação em múltiplos níveis, rejeição em cada nível e conflito concorrente.
- [x] Criar tela/lista de aprovação e detalhe do pedido com itens, cadeia, estado e histórico.
- [x] Exibir ações apenas quando a decisão estiver disponível ao ator/usuário modelado pelo sistema.
- [x] Validar motivo de rejeição antes do envio e também no backend.
- [x] Apresentar explicação quando a cadeia terminar ou não houver ação disponível.
- [x] Incluir loading, erro recuperável e estado vazio nas listas e detalhes.

## Critérios de aceite

- [x] Aprovação só habilita o próximo nível depois da aprovação do nível atual.
- [x] Decisão de nível futuro, decisão repetida ou decisão depois do estado terminal não altera o pedido.
- [x] Rejeição sem motivo não é aceita; com motivo, encerra o fluxo e aparece no histórico.
- [x] Aprovação de todos os níveis encerra o fluxo e desabilita ações com explicação.
- [x] A lista reflete estado e nível atual persistidos pelo backend.
- [x] Detalhes exibem itens e histórico de decisões na ordem cronológica correta.
- [x] Testes verificam que decisões concorrentes não fazem o fluxo avançar duas vezes nem perdem histórico.

## Verificação e conclusão

- Verificações executadas: `mise exec java@21.0.2 -- ./mvnw -f backend/pom.xml test -q`; `npm --prefix frontend test`; `npm --prefix frontend run build`.
- Resultado: suíte backend aprovada com PostgreSQL/Testcontainers; 12 testes Vitest aprovados; type-check e build Vite aprovados.
- [x] Fase concluída e integrada em `obraflow-challenge` (merge commit `0900955`).
