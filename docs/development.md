# Desenvolvimento e verificações locais

A fundação usa Node.js 24, npm com lockfile e PostgreSQL 17. Não exige contas, serviços pagos ou credenciais externas. As credenciais abaixo são exclusivas da demonstração local.

## Aplicação completa por Docker Compose

É necessário Docker Engine ativo e Docker Compose v2. No Windows, abrir o Docker Desktop e aguardar o engine iniciar. A instalação do comando `docker` sozinha não garante que o daemon esteja disponível; verificar com `docker info`.

Na raiz do repositório:

```sh
docker compose up --build --wait
```

Abrir http://localhost:3000. O Compose aguarda o PostgreSQL ficar saudável, aplica migrations com `prisma migrate deploy`, executa o seed explicitamente e só então inicia a aplicação. Falha de migration ou seed impede a subida da aplicação. O seed deve ser seguro para repetição e não pode limpar pedidos ou configurações existentes.

O banco usa `obraflow` como usuário e nome do banco, com senha local `obraflow_local`. O banco fica acessível em `localhost:5432`; dentro dos containers o host é `db`. O Compose fornece a URL interna e não reutiliza a URL do host por engano. A aplicação é publicada apenas em `127.0.0.1`. Dentro do container o servidor escuta `0.0.0.0:3000`.

`PORT` altera a porta publicada da aplicação, mantendo a porta interna em 3000. `LOG_LEVEL` configura o log, com padrão `info`. A porta do banco está fixada em 5432 para corresponder ao ambiente local; em caso de conflito, ajustar o mapeamento do Compose e a URL usada fora dos containers em conjunto.

Inspeção e parada:

```sh
docker compose ps --all
docker compose logs app migrate seed db
docker compose down
```

`down` preserva os dados no volume nomeado `postgres_data`. Não remover o volume para uma atualização normal. As credenciais do Compose devem corresponder ao volume existente; alterar variáveis não muda usuários e senhas de um banco já inicializado.

Com o banco ativo, migrations e seed também podem ser chamados explicitamente, usando o target `tools` da imagem:

```sh
docker compose run --rm migrate
docker compose run --rm seed
```

O target `runner` contém o servidor standalone de produção, executado como usuário `node`. O target `tools` contém Prisma e tsx para tarefas operacionais. O build usa uma URL local ilustrativa para carregar a configuração do Prisma, gera o Prisma Client e compila a aplicação sem conectar ao banco; migrations e seed não ocorrem durante o build. O Compose substitui essa URL em execução.

## Desenvolvimento com Node no host

Copiar `.env.example` para `.env`, preservando a URL local prevista:

```text
DATABASE_URL=postgresql://obraflow:obraflow_local@localhost:5432/obraflow?schema=public
PORT=3000
LOG_LEVEL=info
```

Então:

```sh
npm ci
docker compose up -d db
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Migrations versionadas são a fonte do schema. Não substituir `db:migrate` por `prisma db push` para preparar a entrega. Após mudar o schema durante uma feature, gerar e revisar a migration de desenvolvimento correspondente antes de incorporá-la.

## Verificações

```sh
npm run lint
npm run typecheck
npm run test
npm run build
```

Os testes de integração exigem `TEST_DATABASE_URL` explícita, com banco dedicado cujo nome termine em `_test`. O runner recusa outro nome e também rejeita o mesmo host/porta/banco de `DATABASE_URL` antes de alterar dados. Não apontar esses testes para o banco da demonstração. Criar `obraflow_test` em uma instância PostgreSQL local e usar credenciais próprias ou as credenciais locais acima. Em PowerShell:

```powershell
docker compose exec -T db createdb -U obraflow obraflow_test
$env:TEST_DATABASE_URL = 'postgresql://obraflow:obraflow_local@localhost:5432/obraflow_test?schema=public'
npm run test:integration
Remove-Item Env:TEST_DATABASE_URL
```

O runner aplica migrations no banco de teste antes de chamar Vitest; os testes preparam os dados de demonstração necessários. Não executar `db:migrate` ou `db:seed` no banco de desenvolvimento para preparar os testes. O guard do runner de integração não protege comandos operacionais executados separadamente.

O CI usa PostgreSQL 17 efêmero com nome `obraflow_test`, configura `TEST_DATABASE_URL` separada de `DATABASE_URL`, instala pelo lockfile e executa geração do client, lint, tipos, testes unitários, integração, build e jornadas no Chromium. Migrations e preparação de dados de teste passam pelos runners protegidos.

Para jornadas completas:

```sh
npx playwright install chromium
npm run test:e2e
```

O runner valida a URL antes de escrever, aplica migrations, executa o seed, gera build e inicia servidor temporário na porta 3100. O Playwright não reutiliza um servidor arbitrário já iniciado nessa porta. Não executar E2E e integração simultaneamente no mesmo banco. Screenshots de documentação são geradas em docs/screenshots; traces e falhas ficam em test-results.

## Saúde e diagnóstico

`GET /api/health` retorna 200 quando a aplicação consegue consultar o banco e 503 se a dependência falhar. O healthcheck do Compose usa essa rota. Não é um endpoint de negócio e não precisa do usuário de demonstração.

O Docker Engine precisa estar ativo. Não confundir validação estática do Compose com execução bem-sucedida da stack. Registrar no relatório da entrega quais verificações foram realmente executadas.

## Escolhas da fundação

- Dependências diretas fixadas no package.json e transitivas no package-lock.json; instalar com npm ci.
- Desenvolvimento e build usam o Webpack suportado pelo Next. O Turbopack compilou em Linux, mas falhou ao iniciar o processo de CSS no Windows deste ambiente; manter o mesmo bundler nos dois caminhos evita depender dessa diferença.
- Prisma CLI/Client/adapter na mesma versão estável 7.10.1, sem migrar para a candidata 8.x indicada pelo registro durante a implementação.
- ESLint 10 com regras oficiais de JavaScript, TypeScript e React Hooks. O preset eslint-config-next foi evitado nesta base por dependências transitivas com alerta sem correção disponível compatível; ESLint 9 também já estava sem suporte. O lint atual não inclui as regras específicas do plugin Next ou uma auditoria automatizada completa de acessibilidade.
- Migration SQL acrescenta CHECKs e índice parcial para a faixa sem teto; essas restrições precisam ser preservadas ao revisar migrations futuras, pois nem todas são representadas pelo Prisma schema.
- Seed usa uma transação e lock advisory por execução. Obras já existentes não recebem suas regras iniciais novamente, mesmo se sua configuração tiver sido esvaziada. Alterações de nomes e regras permanecem intactas.
- O guard de integração compara host, porta e banco, normaliza loopbacks e ignora diferença de usuário/schema; aliases de DNS arbitrários não são resolvidos. Nunca configurar um alias remoto para o mesmo banco de desenvolvimento.

As regras completas dos pedidos e o seletor de identidade de demonstração estão implementados. O healthcheck é operacional e não substitui a verificação desses fluxos.

## Verificação local da F01 — 20/10/2026

- Prisma schema válido e migration aplicada em PostgreSQL 17 vazio.
- Seed executado repetidamente; os testes também verificaram ausência de duplicação e preservação de uma configuração editada.
- Lint sem warnings e TypeScript sem erros; 11 testes unitários e 4 de integração aprovados.
- Build de produção Webpack aprovado no Windows e no Docker Linux; instalação npm ci da imagem concluída com lockfile e sem vulnerabilidades reportadas pelo npm naquele momento.
- `docker compose up --build --wait` concluído: banco/aplicação saudáveis; migrate/seed com exit code zero.
- HTTP `/` com 200; `/api/health` com 200, depois 503 durante parada controlada do banco, e 200 após restauração. Dados do volume preservados.
- Revisão técnica independente sem bloqueantes. CI apenas configurado, sem execução remota nesta etapa.

Esses resultados verificam a fundação, não os fluxos de negócio das próximas features.
