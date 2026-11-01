# SDD — Fase 0: Fundação e execução local

## Objetivo

Preparar a estrutura mínima para desenvolver e executar frontend, backend e PostgreSQL localmente, seguindo a stack definida em `AGENTS.md` e `docs/DECISIONS.md`.

## Dependências

Nenhuma.

## Escopo

- Criar `backend/` (Java 21, Spring Boot, Maven) e `frontend/` (Vue 3, TypeScript, Vite, npm).
- Configurar Maven Wrapper, scripts e lockfile do npm.
- Preparar PostgreSQL e serviços necessários no Docker Compose, com configuração local segura e documentada.
- Configurar Flyway e a primeira migração de esquema ou estrutura inicial necessária para a aplicação iniciar.
- Estabelecer configuração de testes: JUnit 5 no backend e Vitest no frontend.
- Definir configuração básica de CORS, endereços de serviço e variáveis de ambiente para desenvolvimento local.

## Tarefas

- [x] Criar a estrutura de diretórios e aplicações com as versões acordadas.
- [x] Configurar execução local de banco e aplicações sem credenciais externas, usando valores de desenvolvimento.
- [x] Confirmar que o backend inicia e conecta ao PostgreSQL, aplicando as migrações Flyway.
- [x] Confirmar que o frontend inicia e consegue alcançar um endpoint de saúde do backend.
- [x] Confirmar que o build de produção do frontend é gerado pelo Vite.
- [x] Adicionar testes iniciais que validem a inicialização/configuração básica de cada camada.
- [x] Documentar comandos básicos de desenvolvimento no README, sem antecipar detalhes ainda não definidos.

## Critérios de aceite

- [x] Uma pessoa consegue iniciar banco, backend e frontend localmente com os comandos documentados.
- [x] Uma base vazia é preparada pelas migrações Flyway sem intervenção manual.
- [x] Os testes mínimos de backend e frontend executam pelos wrappers/scripts do projeto.
- [x] Nenhuma credencial real é necessária ou versionada.

## Verificação e conclusão

Registrar abaixo os comandos executados e o resultado antes de marcar a fase como concluída.

- Verificações executadas: `docker compose -p obraflow-phase0-check up --build -d`; consulta de `GET /api/health`; requisição HTTP ao frontend; consulta a `flyway_schema_history`; `mise exec java@21.0.2 -- ./mvnw -f backend/pom.xml test`; `npm --prefix frontend test`; `npm --prefix frontend run build`; `git diff --check`.
- Resultado: backend, frontend e PostgreSQL iniciaram em um ambiente limpo; API respondeu `{"database":"UP","status":"UP"}`; a migração V1 foi aplicada; testes passaram (1 backend e 1 frontend); build do Vite concluído; Compose temporário removido.
- [x] Fase concluída e integrada em `obraflow-challenge`.
