# Plano de produto e entrega

## Resultado esperado

Permitir que um solicitante cadastre uma compra e acompanhe sua aprovação; que um aprovador saiba o que precisa decidir; e que um responsável configure as alçadas de cada obra. O sistema deve explicar o estado de cada pedido e preservar sua história.

Prazo do enunciado: 01/11/2026 às 23:59, sem fuso explicitado. Para organização pessoal, usar America/Bahia e preparar a entrega antes do último dia.

## Princípios de execução

1. Entregar primeiro uma jornada completa funcionando e persistida.
2. Organizar features por comportamento de negócio, incluindo UI, API, persistência e validação.
3. Usar módulos técnicos compartilhados apenas quando houver necessidade concreta.
4. Exigir evidência verificável para concluir uma feature.
5. Construir diferenciais depois de cobrir todos os requisitos obrigatórios.
6. Reservar tempo para interface, acessibilidade, documentação e demonstração.

## Backlog e branches

As branches partem da integração local `feat/obraflow-delivery`, após suas dependências. main mantém a base do desafio. O responsável é um papel, não a afirmação de que existe um agente ativo. F00–F08 são obrigatórias; os diferenciais selecionados de F09 foram integrados após o fluxo central, antes da revisão final F07/F08.

Entrega implementada em 20/10/2026. Os critérios abaixo permanecem como contrato; os resultados e limites das verificações estão em [Verificação](./verification.md). A tabela registra as branches usadas, não uma lista de novas tarefas pendentes.

| ID  | Feature / resultado demonstrável                                        | Branch utilizada            | Depende de | Responsável principal           |
| --- | ----------------------------------------------------------------------- | --------------------------- | ---------- | ------------------------------- |
| F00 | Contratos de negócio, fluxo das telas, erros e modelo inicial revisados | `docs/product-contracts`    | —          | Produto + arquitetura           |
| F01 | Aplicação e banco iniciam; migrations, seed mínimo e CI funcionam       | `chore/foundation`          | F00        | Integração                      |
| F02 | Cadastros básicos via API e estrutura visual navegável                  | `feat/registry-shell`       | F01        | Implementação                   |
| F03 | Configurar, consultar, editar e remover regras por obra                 | `feat/approval-rules`       | F02        | Implementação                   |
| F04 | Cadastrar pedido com N itens e cadeia persistida                        | `feat/purchase-orders`      | F03        | Implementação                   |
| F05 | Consultar lista, detalhes, etapas e histórico dos pedidos               | `feat/order-tracking`       | F04        | Implementação                   |
| F06 | Aprovar/rejeitar em sequência com proteção contra concorrência          | `feat/approval-decisions`   | F05        | Implementação + revisão técnica |
| F07 | Jornada inteira robusta a falhas e usável em dispositivos diferentes    | `fix/quality-accessibility` | F06        | QA + interface                  |
| F08 | Instalação limpa, documentação, screenshots e demonstração prontas      | `docs/delivery-docs`        | F07        | Integração + produto            |
| F09 | Melhorias de operação selecionadas e testadas                           | `feat/product-enhancements` | F06        | Produto + implementação         |

Os critérios de qualidade se aplicam desde a primeira feature. F07 é a verificação integrada, não o início dos testes ou dos estados de erro. Documentação também cresce em cada PR; F08 confirma a experiência de entrega.

## Critérios de aceite por feature

### F00 — Contratos e desenho do produto

Especificação preparada em 20/10/2026. Evidências: [contrato de negócio](./domain-contract.md), [contrato HTTP](./api-contract.md), [fluxos e wireframes](./product-flows.md) e [decisões](./decisions.md). Estes artefatos definem o comportamento a implementar; não equivalem a testes da aplicação.

- Resolver as ambiguidades registradas em decisions.md.
- Definir estados, transições, seleção de faixa, arredondamento, identidade de demonstração e política para regras alteradas.
- Desenhar fluxo e rascunhos das três telas, incluindo estados de loading, vazio, erro e sucesso.
- Definir contratos HTTP com exemplos, paginação e catálogo de erros de negócio.
- Definir linguagem visual e hierarquia: contexto da obra, valor, situação e responsável atual.
- Evidência: documentos revisados e exemplos de valores nos limites das faixas.

### F01 — Fundação executável

Implementação preparada em 20/10/2026, com execução descrita em [Desenvolvimento](./development.md). O schema inicial cobre apenas cadastros e configuração; pedidos, etapas e decisões serão adicionados nas features correspondentes.

- Next.js + TypeScript, PostgreSQL, Prisma, estilos e ferramentas de validação configurados com versões compatíveis fixadas no lockfile.
- Docker Compose inicia aplicação e banco; .env.example sem segredos; migrations versionadas.
- Scripts de lint, tipos, testes e build executáveis em CI.
- Seed de referências e configuração inicial reproduzível; seed de pedidos será ampliado nas features seguintes.
- Evidência: iniciar ambiente do zero, verificar conexão e executar os checks disponíveis.

### F02 — Cadastros e navegação

- API permite cadastrar e listar obras, usuários e fornecedores; formulários administrativos não são exigidos.
- Campos obrigatórios, referências e erros possuem contrato documentado.
- Navegação entre pedidos, novo pedido e regras; seleção visível de usuário de demonstração.
- Listas possuem loading, erro com retry e estado vazio; ausência de obra impede ações dependentes com orientação clara.
- Evidência: chamadas HTTP reproduzíveis e navegação real alimentada pelo banco.

### F03 — Regras por obra

- Criar, consultar, editar e remover faixas, inclusive a faixa final sem teto.
- Adicionar, remover e reordenar aprovadores; impedir cadeia vazia e usuário duplicado na mesma cadeia.
- Validar limites, referências e atualização concorrente da configuração.
- Substituir a configuração de uma obra atomicamente, evitando que um pedido leia metade da atualização.
- Exclusão de configuração preserva etapas e decisões já atribuídas a pedidos.
- Evidência: testes dos limites e demonstração visual da sequência de aprovadores.

### F04 — Cadastro do pedido

- Tela começa com um item e permite adicionar, editar e remover N itens.
- Obra, fornecedor, data, descrição, unidade, quantidade positiva e preço não negativo validados por campo.
- Nenhum item: erro claro. Total do item e total geral calculados, sem edição direta.
- Servidor recalcula valores e persiste cabeçalho, itens e cópia da cadeia em uma transação.
- Pedido sem regra aplicável não é criado; interface apresenta explicação útil.
- Valores decimais e arredondamento seguem contrato único e determinístico.
- Evidência: fluxo com vários itens, tentativa inválida e teste de rollback sem registros parciais.

### F05 — Acompanhamento

- Lista apresenta identificador, obra, fornecedor, data, número de itens, total, situação e etapa atual.
- Detalhes mostram todos os itens, etapas concluídas/atual/próximas e histórico de decisões.
- Estado atual vem do backend; paginação com ordenação estável evita carregar todo o histórico.
- Seed inclui pedidos pendentes em etapas diferentes, aprovado e rejeitado, com dados coerentes.
- Evidência: estados existentes são verificáveis após reiniciar a aplicação.

### F06 — Decisões

- Somente o usuário atribuído à etapa atual pode decidir; servidor valida essa condição.
- Aprovação libera exatamente a próxima etapa ou encerra o pedido como aprovado.
- Rejeição exige motivo não vazio após trim e encerra o pedido como rejeitado.
- Pedido encerrado não aceita novas decisões; botões explicam a indisponibilidade.
- Cada decisão registra usuário, etapa, instante, resultado e motivo quando aplicável.
- Decisão e mudança de estado são atômicas; concorrência usa versão e devolve conflito explícito.
- Duplo clique, repetição e duas requisições simultâneas não criam decisões duplicadas.
- Evidência: testes de integração com PostgreSQL real e jornada de aprovação/rejeição na UI.

### F07 — Qualidade integrada

- Verificar loading, vazio, erro e retry em todas as listas.
- Verificar falha de criação sem perder os itens preenchidos e falha de decisão sem falso sucesso.
- Navegação por teclado, foco visível, labels, erros associados aos campos e modais com foco correto.
- Situação comunicada por texto, além da cor; datas e moeda em pt-BR.
- Verificar telas em larguras de referência de 360, 768 e 1440 px.
- Revisar acesso direto aos endpoints, conflitos e consultas com muitos pedidos.
- Evidência: checklist registrado com resultados e limitações conhecidas.

### F08 — Entrega

- README final apresenta instalação, ambiente, seed, API, screenshots e decisões técnicas.
- Documentar política de alçada, identidade demo, integridade, execução de testes e evolução para produção.
- Validar instalação a partir de checkout limpo, sem dados locais implícitos.
- Preparar roteiro de demonstração de 5–8 minutos e tópicos para explicar decisões na entrevista.
- Conferir fork e destino do PR. Publicar PR somente quando solicitado; contato pessoal deve vir do usuário.
- Evidência: outra pessoa consegue executar seguindo apenas o README.

## Diferenciais ordenados por valor

| Diferencial                                                 | Valor para o usuário                             | Condição para entrar                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Linha do tempo clara e motivo de bloqueio                   | Reduz dúvida sobre quem precisa agir             | Parte da implementação obrigatória bem acabada                                       |
| Prévia da cadeia antes do cadastro                          | Evita surpresa ao solicitar compra               | Incluída no desenho de F04, usando regras retornadas pelo servidor; criação revalida |
| Filtro “aguardando minha decisão” e busca por identificador | Ajuda o aprovador a encontrar trabalho acionável | F08 concluída e testes preservados                                                   |
| Resumo de quantidade e valor pendente                       | Dá contexto operacional                          | Métricas com definição clara e dados consistentes                                    |

Não adicionar nesta entrega: microserviços, mensageria, event sourcing, multiempresa, aplicativo móvel, integração ERP real ou notificações externas. Essas capacidades exigiriam novos requisitos e validação de valor.

## Estratégia de testes

| Nível      | Cobertura prioritária                                              | Ferramenta / ambiente                  |
| ---------- | ------------------------------------------------------------------ | -------------------------------------- |
| Unidade    | Seleção de faixa, cálculos, arredondamento e transições            | Vitest; domínio sem infraestrutura     |
| Integração | Transações, constraints, versões, concorrência e API               | Vitest + PostgreSQL dedicado de testes |
| Jornada    | Configurar regra → criar pedido → aprovar; rejeitar; corrigir erro | Playwright com seed controlado         |
| Manual     | Responsividade, teclado, clareza, falhas e instalação              | Checklist e screenshots                |

Casos obrigatórios: total zero com itens válidos; limite exato; um centavo acima; quantidade fracionária; preço zero; quantidade zero inválida; nenhuma regra; cadeia vazia; motivo em branco; usuário incorreto; etapa futura; pedido encerrado; edição de regra com pedido pendente; duas decisões simultâneas; falha que deve desfazer toda a transação.

Não perseguir percentual arbitrário de cobertura. Proteger invariantes e jornadas reais. Banco de testes separado, com guardas contra reset do banco de desenvolvimento. CI não pode depender de serviços pagos ou credenciais externas.

## Definition of Done de cada PR

- Critérios da feature demonstrados; UI e API usam dados reais quando aplicável.
- Mudanças de banco incluem migration e ajuste de seed quando necessário.
- Lint, tipos, testes pertinentes e build passam; checks indisponíveis são declarados.
- Validação e autorização permanecem no servidor.
- Estados de interação e falhas tratados; contratos e decisões atualizados.
- Diff revisado; sem segredos, logs pessoais ou abstrações sem uso.
- PR descreve problema, comportamento resultante, verificação e limitações.

## Cronograma sugerido

| Período (2026) | Objetivo                                           |
| -------------- | -------------------------------------------------- |
| 20–21/10       | F00 e F01: contratos, telas e ambiente             |
| 22–23/10       | F02 e F03: cadastros, navegação e regras           |
| 24–25/10       | F04 e F05: pedido e acompanhamento                 |
| 26–27/10       | F06: decisões e integridade                        |
| 28–29/10       | F07: revisão integrada e correções                 |
| 30/10          | F08: instalação limpa, documentação e demo         |
| 31/10          | Reserva para correções; F09 apenas se houver folga |
| 01/11          | Conferência final e entrega antes do limite        |

O cronograma depende da disponibilidade real. Ao atrasar, cortar F09 primeiro e simplificar apresentações opcionais, preservando regras, estados e integridade.
