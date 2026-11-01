# SDD — Fase 1: Cadastros de referência e regras de alçada

## Objetivo

Implementar os dados de referência e a configuração de regras por obra, incluindo a definição inequívoca da faixa aplicável a cada valor.

## Dependências

Fase 0.

## Escopo

- Modelar e persistir obras, usuários, fornecedores, regras/faixas e aprovadores em ordem.
- Disponibilizar operações para cadastrar e listar obras, usuários, fornecedores e regras.
- Implementar a tela de regras: selecionar obra, consultar regras, criar/editar/remover faixas e adicionar/remover/reordenar aprovadores.
- Modelar limites sem ambiguidades, incluindo limites inclusivos/exclusivos, valores monetários e ordenação.
- Definir e documentar o comportamento quando um valor não encontra uma faixa. A decisão deve constar em `docs/DECISIONS.md`.
- Garantir que a configuração inválida ou ambígua não produza uma cadeia de aprovação imprevisível.

## Tarefas

- [x] Criar testes de domínio e persistência para regras por obra, limites, aprovadores e ordenação.
- [x] Definir no registro de decisões a política para faixa sem regra, limites e prevenção de lacunas/sobreposições.
- [x] Criar entidades, migrações, validações e operações de backend para dados de referência e regras.
- [x] Criar testes de API para cadastro, consulta, edição e remoção de níveis/faixas e aprovadores.
- [x] Implementar a tela de regras com seleção de obra e lista de usuários disponíveis.
- [x] Permitir reordenar aprovadores e refletir a ordem persistida ao recarregar a tela.
- [x] Exibir loading, estado vazio e erro recuperável nas consultas usadas por esta fase.
- [x] Validar limites, faixas e aprovadores tanto na interface quanto no backend.

## Critérios de aceite

- [x] Obras, usuários e fornecedores podem ser cadastrados e listados pela API.
- [x] Para uma obra selecionada, regras/faixas podem ser criadas, listadas, editadas e removidas.
- [x] Cada faixa salva tem limites não ambíguos e pelo menos um aprovador válido em ordem definida.
- [x] A tela permite incluir, remover e reordenar aprovadores e mantém a ordem após recarregar.
- [x] A política de valor sem regra está documentada no README e em `docs/DECISIONS.md`.
- [x] Testes cobrem valores nos limites, abaixo/acima dos limites, obra sem regra e configuração inválida.

## Verificação e conclusão

- Verificações executadas: `mise exec java@21.0.2 -- ./mvnw -f backend/pom.xml test` (35 testes em 2026-10-30, com PostgreSQL real via Testcontainers); `npm --prefix frontend test` (2 testes); `npm --prefix frontend run build`.
- Resultado: suíte completa aprovada. Três testes de integração cobrem APIs de cadastro/listagem, criação/consulta/substituição de faixas e persistência de aprovadores ordenados e isolados por obra; os testes de domínio cobrem limites, lacunas, sobreposições e obra sem faixa.
- [x] Fase concluída e integrada em `obraflow-challenge`.
