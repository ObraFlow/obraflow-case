![Banner do ObraFlow](assets/banner.png)

# ObraFlow · Dokimos

Plataforma full-stack para cadastro de pedidos de compra e aprovação por alçada. O projeto está em desenvolvimento; esta etapa entrega a fundação local, a verificação de saúde dos serviços e a estrutura de persistência. As telas de pedidos, aprovações e regras serão construídas nas próximas fases.

As instruções originais do processo seletivo estão em [DESAFIO-INSTRUCOES.md](DESAFIO-INSTRUCOES.md).

## Executar a aplicação

### Requisitos

- Git;
- Docker Engine com Docker Compose v2;
- acesso à internet na primeira execução para baixar as imagens e dependências.

O fluxo com Docker não exige Java nem Node.js instalados na máquina.

### Subir banco, API e frontend

Na raiz do repositório:

```bash
cp .env.example .env
docker compose up --build
```

A primeira execução constrói as imagens do backend e do frontend, inicia o PostgreSQL e aplica as migrações Flyway. Aguarde os serviços iniciarem e acesse:

- Aplicação: <http://localhost:5173>
- API: <http://localhost:8080>
- Saúde da API e do banco: <http://localhost:8080/api/health>
- Saúde operacional: <http://localhost:8080/actuator/health>

A página inicial exibe o estado de conexão da API e do banco. Nesta fase, a API contém somente os endpoints de saúde; os recursos do desafio serão adicionados nas próximas etapas.

Para encerrar os serviços, use `Ctrl+C` ou, em outro terminal:

```bash
docker compose down
```

Os dados do PostgreSQL permanecem no volume `obraflow-postgres-data`. Para remover também esse volume e reiniciar com um banco vazio:

```bash
docker compose down -v
```

### Desenvolvimento com serviços locais

Também é possível executar frontend e backend no host. Requer Java 21, Node.js 22.12 ou superior, npm e Docker Compose. Inicie somente o banco:

```bash
cp .env.example .env
docker compose up -d db
```

Em um terminal, carregue as variáveis e inicie a API:

```bash
set -a; source .env; set +a
./mvnw -f backend/pom.xml spring-boot:run
```

Em outro terminal, instale as dependências e inicie o Vite:

```bash
cd frontend
npm ci
npm run dev
```

Para encerrar o banco, execute `docker compose down` na raiz do projeto.

## Testes e build

Backend:

```bash
./mvnw -f backend/pom.xml test
```

Frontend:

```bash
cd frontend
npm ci
npm test
npm run build
```

## Tecnologias e estrutura

- **Backend:** Java 21, Spring Boot 4, Maven e API REST com JSON.
- **Frontend:** Vue 3, TypeScript, Vite e npm.
- **Persistência:** PostgreSQL 17, acesso JDBC e migrações Flyway.
- **Execução local:** Docker Compose; Maven Wrapper e `package-lock.json` mantêm os comandos e dependências reproduzíveis.

O backend inicia na porta `8080`, o frontend na `5173` e o PostgreSQL na `5432` por padrão. As portas e credenciais de desenvolvimento podem ser configuradas no `.env`, criado a partir de `.env.example`. Os valores incluídos são locais e fictícios; não são necessários serviços pagos ou credenciais externas.

O Vue consulta `GET /api/health` para exibir o estado dos serviços. A API verifica a conexão ao PostgreSQL e responde com o estado da aplicação e do banco. Flyway aplica as migrações versionadas na inicialização; a migração `V1` cria a tabela de metadados da aplicação. O modelo de pedidos, regras de alçada, histórico e dados de demonstração ainda será desenvolvido.

## Informações da entrega

### Cadastros e regras de alçada (Fase 1)

A API oferece `GET/POST /api/works`, `GET/POST /api/users` e `GET/POST /api/suppliers` para os cadastros de referência. As regras são consultadas com `GET /api/works/{id}/approval-bands` e substituídas atomicamente com `PUT` no mesmo recurso. O payload contém faixas ordenadas (`minAmount`, `maxAmount`) e `approverIds` na ordem da aprovação; `maxAmount: null` representa o limite superior aberto.

Os valores monetários não negativos usam faixas `[mínimo, máximo)`: o mínimo está incluído e o máximo é excluído. Toda obra configurada deve começar em R$ 0,00, manter faixas contíguas sem sobreposição e terminar em uma faixa sem limite superior. Assim, cada valor sempre encontra uma única regra. Uma obra sem regras não pode ser usada para criar pedido na Fase 2; a API de pedidos deverá retornar validação clara. Cada faixa precisa de pelo menos um usuário ativo como aprovador. A interface permite cadastrar obras e usuários, ordenar os aprovadores e editar ou remover faixas antes de salvar a configuração.

Exemplo de payload para `PUT /api/works/1/approval-bands`:

```json
[
  { "minAmount": 0, "maxAmount": 10000, "approverIds": [1] },
  { "minAmount": 10000, "maxAmount": null, "approverIds": [1, 2] }
]
```

Fornecedores podem ser cadastrados pela API usando `POST /api/suppliers` com `name` e `taxId`.

As capturas das telas, a modelagem e o cálculo das regras de alçada, os fluxos completos da API, os dados de demonstração, as garantias de integridade do domínio e as considerações de produção serão documentados conforme forem implementados nas próximas fases.
