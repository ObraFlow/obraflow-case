# SDD — Fase 6: Documentação e revisão de entrega

## Objetivo

Deixar a solução reproduzível e avaliável por outra pessoa, com documentação que cubra execução, API, decisões e telas.

## Dependências

Fases 0 a 5.

## Escopo

- Completar o README com instalação, configuração, inicialização da solução e carga de dados.
- Documentar tecnologias escolhidas e motivos, arquitetura de aprovação, persistência, consistência e comunicação frontend/backend.
- Documentar endpoints e exemplos de payloads/respostas/erros da API.
- Incluir screenshots atuais das três telas.
- Explicar o comportamento para valor sem regra aplicável e demais decisões relevantes.
- Registrar o que mudaria em produção, conforme solicitado pelo desafio.
- Fazer revisão final de requisitos e comandos a partir de uma configuração limpa.

## Tarefas

- [x] Atualizar README com pré-requisitos, configuração de ambiente e comandos completos para iniciar e parar.
- [x] Documentar como popular/recriar dados de demonstração.
- [x] Documentar principais endpoints, payloads, erros e fluxo de decisão.
- [x] Escrever seção `Decisões técnicas` com tecnologias/motivos, modelagem, cálculo e persistência da alçada, comunicação e integridade.
- [x] Capturar e adicionar screenshots legíveis das três telas finais.
- [x] Escrever considerações do que mudaria em produção.
- [x] Seguir README desde ambiente limpo e confirmar que não exige credenciais externas ou serviços pagos.
- [x] Conferir todos os requisitos do README e atualizar a matriz do SDD geral com evidências.
- [x] Revisar documentação, dependências, arquivos temporários e configuração para garantir que nenhum segredo foi incluído.

## Critérios de aceite

- [x] Uma pessoa sem contexto prévio consegue iniciar e popular a aplicação seguindo o README.
- [x] README explica endpoints principais e contém payloads suficientes para consumir a API.
- [x] README contém screenshots das três telas e todos os tópicos técnicos pedidos no desafio.
- [x] Decisões do README são coerentes com `docs/DECISIONS.md` e com o comportamento implementado.
- [x] Cada requisito do desafio está atendido ou tem limitação explicitamente documentada.
- [x] O checklist de conclusão do SDD geral pode ser revisado com evidências.

## Verificação e conclusão

- Verificações executadas: `git diff --check`; `docker compose -p obraflow-phase6-review up --build -d`; carga do perfil `demo-data` em PostgreSQL novo; `GET /api/health`; consulta de `GET /api/orders`; resposta HTTP do frontend; capturas via Playwright e Google Chrome local.
- Resultado: banco e API responderam `UP`; a carga criou 14 pedidos em estados `APPROVED`, `PENDING` e `REJECTED`; o frontend respondeu `200 OK`; as três capturas foram revisadas e adicionadas ao README. A instância isolada e seu volume temporário foram removidos. Nenhum navegador foi baixado.
- Commit integrado: `df89be9 docs: completar documentação de entrega`.
- [x] Fase concluída e integrada em `obraflow-challenge`.
