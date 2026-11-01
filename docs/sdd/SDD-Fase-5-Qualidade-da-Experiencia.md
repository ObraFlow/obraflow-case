# SDD — Fase 5: Estados, validações e acabamento da experiência

## Objetivo

Fazer uma revisão transversal dos fluxos para garantir estados visíveis, validações compreensíveis e interface consistente, responsiva e acessível.

## Dependências

Fases 1, 2 e 3.

## Escopo

- Conferir loading em todas as listas, inclusive regras, pedidos, obras, usuários e fornecedores.
- Conferir estados vazios, especialmente ausência de obras, e erros de API/rede/500 com nova tentativa.
- Conferir validações exigidas pelo README no frontend e backend.
- Revisar hierarquia visual, consistência, responsividade e acessibilidade básica das três telas.
- Confirmar que erros não mostram stack traces ou detalhes internos.

## Tarefas

- [x] Criar ou completar testes para loading, empty, falha e recuperação nas telas.
- [x] Validar mensagens de erro por campo para descrição, quantidade, preço, obra, fornecedor, data e motivo de rejeição.
- [x] Conferir pedido sem itens, dados obrigatórios vazios e formatos numéricos inválidos.
- [x] Conferir tela de aprovação para cadeia concluída e sem ação disponível.
- [x] Fazer revisão visual em larguras de tela representativas e corrigir overflow ou controles impraticáveis.
- [x] Conferir labels, foco visível, navegação por teclado e semântica dos controles principais.
- [x] Conferir que listas e detalhes podem ser recarregados e tentados novamente após falhas transitórias.

## Critérios de aceite

- [x] Toda lista assíncrona apresenta loading enquanto aguarda resposta.
- [x] Falha de API/rede/500 mostra mensagem compreensível e ação de tentar novamente.
- [x] Ausência de obras ou de registros relacionados mostra empty state amigável, nunca tela em branco.
- [x] Todas as situações de validação exigidas pelo README impedem envio inválido e indicam correção.
- [x] As três telas permanecem utilizáveis em telas estreitas e por teclado.
- [x] Nenhuma mensagem ao usuário expõe detalhes internos do backend.

## Verificação e conclusão

- Verificações executadas:
  - `cd frontend && npm test`: 6 arquivos, 22 testes aprovados.
  - `cd frontend && npm run build`: compilação TypeScript e build Vite aprovados.
  - `mise exec java@21.0.2 -- ./mvnw -f backend/pom.xml test`: 37 testes aprovados, incluindo Testcontainers/PostgreSQL.
  - Capturas headless com Firefox a 360 px e 640 px: navegação e formulários reorganizados sem overflow horizontal.
  - `git diff --check`: sem erros de whitespace.
- Resultado: estados de carregamento/vazio/erro e recuperação, validações, acessibilidade básica e resposta 500 genérica foram conferidos. A resposta HTTP não contém detalhes da exceção, embora a causa permaneça registrada nos logs do servidor.
- [x] Fase concluída e integrada em `obraflow-challenge` (merge `eb45841`).
