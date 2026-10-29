![Banner do ObraFlow](assets/banner.png)

# ObraFlow · Dokimos

Plataforma full-stack para cadastro de pedidos de compra e aprovação por alçada. As Fases 0 e 1 entregam a fundação local, os cadastros de referência e as regras de alçada; a Fase 2 permite cadastrar pedidos com itens e persiste a cadeia inicial de aprovação; a Fase 3 permite analisar pedidos, decidir na ordem da cadeia e consultar o histórico.

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

A aplicação exibe o estado de conexão da API e do banco e oferece o cadastro de pedidos e a configuração das regras de alçada.

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

O teste de persistência do backend usa Testcontainers para iniciar um PostgreSQL descartável e confirmar o rollback de pedidos; mantenha o Docker Engine em execução ao rodar a suíte completa.

Frontend:

```bash
cd frontend
npm ci
npm test
npm run build
```

## Tecnologias e estrutura

- **Backend:** Java 21, Spring Boot 4, Maven e API REST com JSON, organizada em controllers, services, repositories JDBC e DTOs validados.
- **Frontend:** Vue 3, TypeScript, Vite e npm.
- **Persistência:** PostgreSQL 17, acesso JDBC e migrações Flyway. A substituição das faixas é transacional e as consultas carregam faixas e aprovadores em conjunto.
- **Execução local:** Docker Compose; Maven Wrapper e `package-lock.json` mantêm os comandos e dependências reproduzíveis.

O backend inicia na porta `8080`, o frontend na `5173` e o PostgreSQL na `5432` por padrão. As portas e credenciais de desenvolvimento podem ser configuradas no `.env`, criado a partir de `.env.example`. Os valores incluídos são locais e fictícios; não são necessários serviços pagos ou credenciais externas.

O Vue consulta `GET /api/health` para exibir o estado dos serviços. A API verifica a conexão ao PostgreSQL e responde com o estado da aplicação e do banco. Flyway aplica as migrações versionadas na inicialização. Os dados de demonstração serão adicionados na Fase 4.

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

### Cadastro de pedidos (Fase 2)

A tela **Pedidos** carrega obras e fornecedores ativos e permite informar a data, observações e um ou mais itens. Quantidades aceitam até três casas decimais; preços unitários aceitam até duas. O total de cada item é calculado e arredondado para centavos usando arredondamento comercial (*half up*); o total do pedido é a soma dos itens já arredondados. A interface usa aritmética decimal inteira para exibir os valores sem erro de ponto flutuante.

A API recalcula os totais e não recebe valores totais do cliente. Em uma única transação, persiste o pedido, seus itens e uma fotografia ordenada dos aprovadores da faixa aplicável ao total consolidado. A fotografia inclui os identificadores e nomes/e-mails dos aprovadores e não é alterada quando as regras da obra forem substituídas. Um pedido não pode ser criado se a obra não existir, o fornecedor estiver inativo ou não houver uma faixa aplicável; nesse caso, a API retorna `400` com uma mensagem orientando configurar as regras.

Endpoints principais:

- `GET /api/orders`: lista os pedidos com itens, total e cadeia inicial;
- `GET /api/orders/{id}`: consulta um pedido;
- `POST /api/orders`: cria um pedido e responde `201 Created`.

Exemplo de corpo para `POST /api/orders`:

```json
{
  "workId": 1,
  "supplierId": 1,
  "orderDate": "2026-10-29",
  "internalNotes": "Entrega antes da concretagem",
  "items": [
    { "description": "Cimento CP-II", "quantity": 20.5, "unit": "sc", "unitPrice": 38.9 },
    { "description": "Areia média", "quantity": 2, "unit": "m³", "unitPrice": 140 }
  ]
}
```

O retorno inclui os itens com `total` calculado, o `total` do pedido, `approvalBandId`, `status` inicial `PENDING` e `approvers` ordenados por `position`. Erros de validação usam Problem Details e mensagens em português.

### Aprovação e histórico (Fase 3)

A seção **Aprovações** lista os pedidos com estado e etapa atual. Ao abrir um pedido, a tela mostra os itens, a cadeia ordenada e o histórico cronológico. Somente o aprovador da etapa atual recebe ações. Uma aprovação libera a próxima etapa; a última conclui o pedido. Uma rejeição exige motivo e encerra o fluxo imediatamente.

Endpoints principais:

- `GET /api/orders` e `GET /api/orders/{id}` retornam o pedido, `currentApproverPosition` (nulo quando o fluxo termina), a cadeia `approvers` e os eventos em `decisions`;
- `POST /api/orders/{id}/decisions` registra uma decisão. Para aprovar: `{"approverId": 1, "outcome": "APPROVED"}`. Para rejeitar: `{"approverId": 1, "outcome": "REJECTED", "reason": "Pedido fora do orçamento"}`.

O backend confere o ator com o aprovador atual e, em uma transação, bloqueia o pedido, grava o evento e atualiza a etapa/estado. Decisões fora da ordem, repetidas ou após o encerramento são recusadas sem alterar o histórico. A tabela de decisões guarda usuário, nome/e-mail congelados, etapa, resultado, instante e motivo.

O desafio não inclui autenticação. Para permitir avaliar o fluxo localmente, a tela envia o `approverId` da etapa atual e o backend valida sua correspondência com a cadeia salva. Essa identificação serve ao fluxo demonstrativo e deve ser substituída pela identidade autenticada do usuário em um ambiente de produção.

Erros da API usam o formato Problem Details (`title`, `status` e `detail`). Dados inválidos retornam `400`, recursos inexistentes retornam `404`, e violações de unicidade retornam `409`; erros internos não expõem detalhes técnicos.

As capturas das telas, a modelagem e o cálculo das regras de alçada, os fluxos completos da API, os dados de demonstração, as garantias de integridade do domínio e as considerações de produção serão documentados conforme forem implementados nas próximas fases.
