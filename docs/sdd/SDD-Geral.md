# SDD geral — Desafio ObraFlow

Este documento coordena as fases de implementação e acompanha sua conclusão. Os requisitos funcionais completos são os de [`DESAFIO-INSTRUCOES.md`](../../DESAFIO-INSTRUCOES.md); este plano os organiza em entregas verificáveis sem substituí-los.

## Como usar

- Leia `AGENTS.md`, `OPTMEM.md`, este documento e o SDD da fase antes de iniciar trabalho.
- Desenvolva uma fase por vez. Cada fase deve ter sua própria branch e worktree, criada a partir de `obraflow-challenge`, conforme `AGENTS.md`.
- Os SDDs descrevem entregas verticais. Quando houver interface para o fluxo, implemente frontend, backend e persistência em conjunto.
- Marque uma tarefa como concluída somente após implementar e verificar seu critério de aceite. Marque a fase abaixo com `[x]` somente quando todos os critérios do SDD específico estiverem atendidos, os testes relevantes passarem e o trabalho estiver integrado em `obraflow-challenge`.
- Ao concluir uma fase, atualize este documento e o SDD específico, registre decisões relevantes em [`DECISIONS.md`](../DECISIONS.md) e anote no OptMem os aprendizados duradouros.
- Não marque itens como concluídos durante o planejamento.

## Fases e dependências

| Status | Fase | Documento | Depende de |
|---|---|---|---|
| [x] | 0. Fundação e execução local | [SDD-Fase-0-Fundacao.md](SDD-Fase-0-Fundacao.md) | — |
| [x] | 1. Cadastros de referência e regras de alçada | [SDD-Fase-1-Cadastros-e-Regras.md](SDD-Fase-1-Cadastros-e-Regras.md) | 0 |
| [x] | 2. Cadastro de pedido de compra | [SDD-Fase-2-Cadastro-de-Pedido.md](SDD-Fase-2-Cadastro-de-Pedido.md) | 1 |
| [x] | 3. Aprovação e histórico | [SDD-Fase-3-Aprovacao.md](SDD-Fase-3-Aprovacao.md) | 1, 2 |
| [x] | 4. Dados de demonstração | [SDD-Fase-4-Dados-de-Demonstracao.md](SDD-Fase-4-Dados-de-Demonstracao.md) | 1, 2, 3 |
| [x] | 5. Estados, validações e acabamento da experiência | [SDD-Fase-5-Qualidade-da-Experiencia.md](SDD-Fase-5-Qualidade-da-Experiencia.md) | 1, 2, 3 |
| [x] | 6. Documentação e revisão de entrega | [SDD-Fase-6-Documentacao-e-Entrega.md](SDD-Fase-6-Documentacao-e-Entrega.md) | 0–5 |

## Cobertura dos requisitos do desafio

| Requisito do README | Fase(s) responsável(is) | Evidência |
|---|---|
| Aplicação completa executável localmente, sem serviços pagos ou credenciais externas | 0, 6 | README: execução; Compose limpo validado sem `.env` ou credenciais externas |
| Separação frontend/backend, persistência, evolução de esquema e consistência | 0, 1, 2, 3 | README: Tecnologias, Estrutura e Decisões técnicas; migrações em `backend/src/main/resources/db/migration/` |
| Cadastrar e listar obras, usuários, fornecedores, pedidos e regras | 1, 2, 3 | README: API resumida e Informações da entrega |
| Configurar por obra faixas/níveis e aprovadores ordenados; criar, editar, remover e consultar | 1 | README: Cadastros e regras de alçada; screenshot Regras da alçada |
| Definir o comportamento para valores sem regra aplicável | 1, 2 | README: Cadastros e regras de alçada e Decisões técnicas |
| Pedido com obra, fornecedor, data, observações e um ou mais itens editáveis antes do envio | 2 | README: Cadastro de pedidos; screenshot Cadastro de pedido |
| Quantidades positivas, preços não negativos, totais calculados e alçada pelo total do pedido | 2 | README: Cadastro de pedidos e Decisões técnicas |
| Persistir cabeçalho, itens, totais e cadeia inicial de aprovadores | 2 | README: Cadastro de pedidos e Modelagem e cálculo da alçada |
| Listar pedidos com contexto, resumo, estado e alçada atual; abrir detalhes e itens | 3 | README: Aprovação e histórico; screenshot Aprovações |
| Aprovar somente na ordem, rejeitar com motivo obrigatório, interromper fluxo e preservar histórico | 3 | README: Aprovação e histórico e diagrama da alçada |
| Bloquear decisões quando o fluxo estiver concluído ou não houver decisão disponível | 3, 5 | README: Aprovação e histórico e Estados e acessibilidade |
| Pelo menos duas obras, usuários, regras e pedidos em estados diferentes | 4 | README: Popular dados de demonstração; Compose limpo retornou 14 pedidos nos três estados |
| Loading em toda lista; estados vazio e erro com opção de tentar novamente | 1, 2, 3, 5 | README: Estados e acessibilidade |
| Validações e mensagens para campos inválidos, pedido sem itens e rejeição sem motivo | 2, 3, 5 | README: Cadastro de pedidos, Aprovação e histórico e Estados e acessibilidade |
| README com instalação, configuração, execução, seed, API, screenshots e decisões técnicas | 6 | README: seções Executar, API resumida, Capturas de tela e Decisões técnicas |
| Interface clara, consistente, responsiva e utilizável por teclado | 2, 3, 5 | README: Estados e acessibilidade; três capturas revisadas no Chrome |

## Critério de conclusão do desafio

- [x] Todas as fases estão concluídas e marcadas neste documento.
- [x] Todos os critérios de aceite dos SDDs específicos foram verificados.
- [x] O README permite que outra pessoa instale, configure, inicialize e avalie a aplicação localmente seguindo apenas suas instruções.
- [x] Os requisitos do README foram revisados um a um; lacunas e decisões de produto foram resolvidas e documentadas.
- [x] Testes e verificações de qualidade relevantes passam; resultados e limitações restantes foram registrados.
- [x] Screenshots das telas finais e decisões técnicas estão documentados.
