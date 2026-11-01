# SDD — Fase 2: Cadastro de pedido de compra

## Objetivo

Entregar o cadastro ponta a ponta de pedidos com cabeçalho, N itens, total calculado e cadeia inicial de aprovação persistida.

## Dependências

Fases 0 e 1.

## Escopo

- Criar e listar pedidos pela API.
- Construir a tela de cadastro com obra, fornecedor, data, observações e pelo menos um item em branco inicialmente.
- Permitir adicionar, editar e remover itens antes do envio.
- Calcular total de item e total do pedido; usar o total do pedido para resolver a regra.
- Persistir atomicamente cabeçalho, itens, totais e fotografia/cadeia inicial de aprovadores aplicável.
- Definir claramente o comportamento para alteração posterior de uma regra, sem reescrever silenciosamente a cadeia de pedidos existentes.

## Tarefas

- [x] Escrever testes para cálculo monetário, validação dos itens e totalização do pedido.
- [x] Criar entidades, DTOs, migrações e operações para criação e consulta de pedidos e itens.
- [x] Recalcular e validar totais no backend; não aceitar totais enviados pelo cliente como fonte de verdade.
- [x] Resolver obra + total contra as faixas da Fase 1 e persistir a cadeia inicial em uma transação.
- [x] Escrever testes de API e persistência para sucesso, falhas de validação e ausência de regra aplicável.
- [x] Implementar o formulário Vue com edição dinâmica de itens, resumo do total e campos de erro associados.
- [x] Carregar obras e fornecedores da API e tratar lista vazia, loading e falha com opção de tentar novamente.
- [x] Desabilitar o envio enquanto dados gerais ou qualquer item forem inválidos; manter validação equivalente no backend.
- [x] Atualizar documentação da API e registrar a política de imutabilidade/revisão da cadeia já criada.

## Critérios de aceite

- [x] Só é possível criar pedido com obra, fornecedor, data e um ou mais itens válidos.
- [x] Quantidade aceita apenas valor numérico positivo; preço unitário aceita zero ou valor positivo; descrição e unidade são obrigatórias.
- [x] Total de cada item é quantidade × preço unitário e não é editável diretamente; total do pedido é a soma dos itens.
- [x] Os valores monetários e arredondamentos são tratados de forma consistente no frontend, backend e banco.
- [x] O backend persiste cabeçalho, itens, totais e aprovadores da regra selecionada atomicamente.
- [x] Faixa aplicável considera o total do pedido, não valores individuais de itens.
- [x] Sem faixa aplicável, a criação segue a política definida e apresenta erro claro ao usuário.
- [x] Testes provam que uma falha durante a criação não deixa cabeçalho, itens ou cadeia parcialmente persistidos.

## Verificação e conclusão

- Verificações executadas:
  - `mise exec java@21 -- ./mvnw -q -f backend/pom.xml test` — 20 testes passaram, incluindo PostgreSQL 17 via Testcontainers.
  - `npm run build` — passou.
  - `npm test` — 11 testes passaram.
  - Smoke test local: Flyway aplicou V3; POST, GET de lista e GET de detalhe retornaram pedido, totais e aprovadores esperados.
- Resultado: pedido, itens e fotografia ordenada da alçada são gravados em uma transação; falha forçada no insert de item confirmou rollback das três tabelas.
- [x] Fase concluída e integrada em `obraflow-challenge` (commit `deec783`).
