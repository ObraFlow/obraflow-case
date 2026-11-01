![Banner do desafio ObraFlow](assets/banner.png)

# ObraFlow — Dokimos | Serviço de Alçadas de Aprovação

Solução full-stack desenvolvida para o desafio técnico da **ObraFlow**. O **Dokimos** é o serviço responsável pela gestão inteligente de **alçadas de aprovação** de pedidos de compra no setor da construção civil, assegurando conformidade financeira, trilha auditável e autonomia operacional configurável por obra.

---

## 📑 Sumário

- [Visão Geral & Telas](#-visão-geral--telas)
- [Tecnologias Escolhidas & Justificativas](#-tecnologias-escolhidas--justificativas)
- [Como a Regra de Alçada é Modelada, Calculada e Persistida](#-como-a-regra-de-alçada-é-modelada-calculada-e-persistida)
- [Comunicação Front-end & Back-end](#-comunicação-front-end--back-end)
- [Consistência e Integridade de Dados](#-consistência-e-integridade-de-dados)
- [Como Executar o Projeto Localmente](#-como-executar-o-projeto-localmente)
- [Documentação da API (Endpoints e Payloads)](#-documentação-da-api-endpoints-e-payloads)
- [Testes Automatizados](#-testes-automatizados)
- [O que Mudaria em Produção](#-o-que-mudaria-em-produção)
- [Identificação do Candidato](#-identificação-do-candidato)

---

## 🖥️ Visão Geral & Telas

A solução é composta por 3 telas integradas com tratamento completo de estados (*loading*, *empty states*, validações em tempo real e *error banners* com retry):

1. **Aprovações & Listagem de Pedidos (`/pedidos`)**:
   - Tabela responsiva com identificador, obra, fornecedor, quantidade de itens, data, valor total e situação (*Pendente*, *Aprovado*, *Rejeitado*).
   - Indicador contextual da alçada atual (etapa corrente, aprovadores concluídos e próximos na fila).
   - Filtros dinâmicos por obra e status.
   - **Drawer lateral de detalhes**: itens detalhados com preços unitários, linha do tempo (*stepper*) visual da alçada e histórico de auditoria completo.
   - Ações imediatas de **Aprovar** e **Rejeitar** (com modal de justificativa obrigatória).

2. **Cadastro de Pedido de Compra (`/pedidos/novo`)**:
   - Cabeçalho com obra de destino, fornecedor homologado, data de emissão e observações internas.
   - Tabela de **N itens dinâmicos**: adição, edição e remoção de materiais/serviços com cálculo automático do total de cada item (`quantidade × preço unitário`).
   - Painel de totalização em destaque com soma em tempo real.
   - Validações restritivas que desabilitam o envio até que todos os campos e itens estejam válidos.
   - Associação imediata da regra de alçada no backend com retorno amigável caso não haja regra cobrindo o valor.

3. **Configuração de Regras de Alçada por Obra (`/regras`)**:
   - Seletor de obra para gestão independente das alçadas Dokimos.
   - Tabela de faixas cadastradas com visualização em cadeia (`Aprovador 1 → Aprovador 2 → ...`).
   - Formulário para criar e editar faixas de valor (mínimo e máximo).
   - Seleção de usuários disponíveis com botões de **reordenação sequencial** (↑ e ↓) e remoção.

> **Destaque de Usabilidade**: No topo da aplicação (navbar), há um seletor rápido **"Simular como: [Usuário]"**. Ele permite alternar instantaneamente entre os aprovadores (João Silva, Amanda Oliveira, Carlos Mendonça, Fernanda Costa) para testar o avanço sequencial da cadeia de alçada com um clique.

---

## 🛠️ Tecnologias Escolhidas & Justificativas

| Camada | Tecnologia | Motivo da Escolha |
|---|---|---|
| **Backend** | **NestJS (Node.js + TypeScript)** | Framework robusto, arquitetura modular e opinativa (Dependency Injection), excelente tipagem estrita, DTOs com validação em tempo de execução via `class-validator` e documentação nativa com OpenAPI/Swagger. |
| **Persistência / ORM** | **Prisma ORM** | Type-safety de ponta a ponta, migrações declarativas, manipulação declarativa de transações relacionais (`$transaction`) e prevenção nativa de SQL Injection. |
| **Banco de Dados** | **PostgreSQL 16** | Banco relacional corporativo de padrão ACID, com suporte robusto a tipos decimais monetários de alta precisão (`DECIMAL(12, 2)`), constraints de unicidade compostas e chaves estrangeiras com integridade referencial. |
| **Frontend** | **Angular (v21 - Standalone Components)** | Framework completo para aplicações empresariais e ERPs, formulários reativos (`ReactiveFormsModule`), sistema de rotas nativo, injeção de dependência e facilidade de manutenção em arquitetura baseada em componentes. |
| **Infraestrutura Local** | **Docker Compose** | Sobe o banco de dados PostgreSQL com um único comando sem exigir instalação manual ou configurações de portas externas. |

---

## ⚖️ Como a Regra de Alçada é Modelada, Calculada e Persistida

### 1. Modelagem Relacional

- **`Obra`**: Unidade central de custo e projeto.
- **`Usuario`**: Responsáveis com cargos específicos (ex: *Engenheiro Residente*, *Gerente de Obras*, *Diretor de Operações*).
- **`RegraAlcada`**: Define faixas de valor financeiro pertencentes a uma obra:
  - `valorMinimo`: Valor inicial da faixa (inclusive).
  - `valorMaximo`: Valor teto da faixa (se `NULL`, representa faixa sem limite superior — "Acima de R$ X").
- **`RegraAlcadaAprovador`**: Tabela associativa com constraint de unicidade `@@unique([regraAlcadaId, ordem])` e `@@unique([regraAlcadaId, usuarioId])`, garantindo que:
  - Não há ordem repetida na mesma regra.
  - O mesmo aprovador não pode ser duplicado em níveis diferentes da mesma regra.
- **`Pedido`**: Cabeçalho do pedido, armazenando `valorTotal` calculado, `status` (`PENDENTE`, `APROVADO`, `REJEITADO`), `regraAlcadaId` e `nivelAtualOrdem` (etapa corrente aguardando decisão).
- **`PedidoAprovacao`**: Snapshot imutável da cadeia de aprovação gerada para o pedido no momento da sua emissão.
- **`PedidoHistorico`**: Trilha de auditoria imutável registrando cada evento (`CRIADO`, `APROVADO`, `REJEITADO`), com autor, carimbo de data/hora e justificativa.

### 2. Motor de Decisão (`AlcadaEngine`)

Quando um pedido é submetido:
1. O backend calcula o total de cada item (`quantidade × precoUnitario`) e totaliza o pedido.
2. O serviço `RegrasAlcadaService.determinarAlcada(obraId, valorTotal)` executa uma busca ponderada:
   ```sql
   WHERE "obraId" = :obraId
     AND "valorMinimo" <= :valorTotal
     AND ("valorMaximo" IS NULL OR "valorMaximo" >= :valorTotal)
   ORDER BY "valorMinimo" DESC
   ```
3. **Tratamento de Exceção para Valores sem Regra**: Caso nenhuma regra cubra a faixa, o pedido é rejeitado pelo servidor com `400 Bad Request` e uma mensagem clara: *"Nenhuma regra de alçada configurada na obra [Nome] para o valor total de R$ [Valor]. Cadastre a regra antes de emitir o pedido."*
4. Havendo regra válida, o pedido é gravado em transação atômica (`$transaction`), gerando as etapas em `PedidoAprovacao` e definindo `nivelAtualOrdem = 1`.

### 3. Execução Sequencial e Bloqueio de Decisões Fora de Ordem

- Ao aprovar uma etapa (`POST /api/pedidos/:id/aprovar`), o backend valida:
  - Se o pedido está com status `PENDENTE`.
  - Se o usuário autenticado corresponde **exatamente** ao usuário da etapa indicada por `nivelAtualOrdem`.
- Se a validação passar:
  - Marca a etapa como `APROVADO`.
  - Se houver próxima etapa (`ordem + 1`), avança `nivelAtualOrdem = nivelAtualOrdem + 1`.
  - Se for a última etapa, atualiza o pedido para `status = APROVADO` e `nivelAtualOrdem = null`.
- Em caso de **Rejeição** (`POST /api/pedidos/:id/rejeitar`):
  - O motivo é **estritamente obrigatório** (validação no DTO com `@MinLength(5)`).
  - O fluxo é **imediatamente interrompido**: `status = REJEITADO`, `nivelAtualOrdem = null` e `motivoRejeicao` persistido no pedido e no histórico.
  - As etapas seguintes não são executadas.

---

## 📡 Comunicação Front-end & Back-end

- Comunicação assíncrona orientada a serviços REST via **`HttpClient`** com tipagem estrita via interfaces TypeScript compartilhadas (`models.ts`).
- **CORS habilitado** no NestJS para permitir chamadas do front-end Angular.
- **Global Prefix** `/api` para versionamento e organização das rotas.
- Tratamento de erros HTTP padronizado na camada de serviços do Angular, exibindo mensagens compreensíveis para o operador em banners dedicados e modais de erro.

---

## 🔒 Consistência e Integridade de Dados

1. **Atomicidade com Transações ACID (`prisma.$transaction`)**:
   A criação do pedido, a geração de seus itens, a criação do snapshot da alçada e a primeira entrada na auditoria ocorrem em um único bloco transacional. Se qualquer passo falhar, nenhum dado órfão é gravado.
2. **Precisão Numérica Decimal**:
   Campos financeiros e quantitativos utilizam `DECIMAL(12, 2)` e `DECIMAL(10, 3)` para evitar inconsistências de arredondamento inerentes a números de ponto flutuante (*float/double*).
3. **Cálculo de Totais no Servidor**:
   O total do pedido é recalculado e validado exclusivamente no backend no momento da persistência, garantindo que valores manipulados no cliente não sejam gravados.
4. **Trilha Imutável de Auditoria (`PedidoHistorico`)**:
   Todas as aprovações, rejeições e motivos são gravados de forma append-only, assegurando conformidade e transparência fiscal e corporativa.

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- **Node.js** (v18 ou superior — testado no Node v24)
- **Docker & Docker Compose** (para o PostgreSQL)

---

### Passo 1: Clonar o Repositório e Instalar Dependências

```bash
# Na raiz do projeto:
npm install --prefix backend
npm install --prefix frontend
```

---

### Passo 2: Subir o Banco de Dados PostgreSQL

Execute o Docker Compose na raiz do projeto:

```bash
docker compose up -d
```
*(Caso não possua o Docker ativo, você pode apontar o `DATABASE_URL` no arquivo `backend/.env` para qualquer instância PostgreSQL de sua preferência).*

---

### Passo 3: Executar Migrações e Carregar Dados de Demonstração (Seed)

Dentro da pasta `backend`:

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
npm run seed
```

O comando de seed carrega automaticamente:
- **2 Obras**: Residencial Horizonte Azul e Edifício Metrópole Tower.
- **4 Usuários com cargos reais**: João Silva (*Engenheiro*), Amanda Oliveira (*Gerente*), Carlos Mendonça (*Diretor*) e Fernanda Costa (*Suprimentos*).
- **3 Fornecedores**: Votorantim Cimentos, Gerdau Aços, Tigre Materiais.
- **5 Regras de alçada** cobrindo diferentes faixas de valor por obra.
- **3 Pedidos de compra em estados reais**:
  - `PED-2026-0001`: **Pendente** (aguardando João na etapa 1).
  - `PED-2026-0002`: **Aprovado** (aprovado por João e Amanda com cadeia concluída).
  - `PED-2026-0003`: **Rejeitado** (interrompido por Amanda com motivo e justificativa registrados).

---

### Passo 4: Iniciar o Backend (NestJS)

```bash
# Na pasta backend:
npm run start:dev
```
- API disponível em: `http://localhost:3000/api`
- Documentação interativa Swagger: `http://localhost:3000/api/docs`

---

### Passo 5: Iniciar o Frontend (Angular)

Em outro terminal, na pasta `frontend`:

```bash
# Na pasta frontend:
npm start
```
- Aplicação web disponível em: `http://localhost:4200`

---

## 📚 Documentação da API (Endpoints e Payloads)

O Swagger interativo está disponível em `http://localhost:3000/api/docs`. Abaixo estão os principais endpoints:

### Obras & Fornecedores & Usuários
- `GET /api/obras`: Lista todas as obras cadastradas.
- `GET /api/usuarios`: Lista os usuários disponíveis para aprovação.
- `GET /api/fornecedores`: Lista fornecedores homologados.

### Regras de Alçada
- `GET /api/regras-alcada?obraId={obraId}`: Lista regras e cadeia de aprovadores da obra.
- `POST /api/regras-alcada`: Cria nova faixa de alçada com aprovadores ordenados.
  ```json
  {
    "obraId": "uuid-obra",
    "descricao": "Até R$ 10.000,00",
    "valorMinimo": 0,
    "valorMaximo": 10000,
    "aprovadores": [
      { "usuarioId": "uuid-usuario-joao", "ordem": 1 }
    ]
  }
  ```
- `PUT /api/regras-alcada/{id}`: Atualiza faixa e reordena aprovadores.
- `DELETE /api/regras-alcada/{id}`: Exclui uma regra.

### Pedidos de Compra
- `GET /api/pedidos`: Lista pedidos com filtros opcionais (`obraId`, `status`) e contexto resumido da alçada.
- `GET /api/pedidos/{id}`: Detalhes completos do pedido, itens, cadeia e histórico.
- `POST /api/pedidos`: Cadastra novo pedido de compra com itens.
  ```json
  {
    "obraId": "uuid-obra",
    "fornecedorId": "uuid-fornecedor",
    "dataPedido": "2026-11-01",
    "observacoes": "Compra urgente para concretagem",
    "itens": [
      {
        "descricao": "Cimento CP II 50kg",
        "quantidade": 100,
        "unidade": "sc",
        "precoUnitario": 38.00
      }
    ]
  }
  ```
- `POST /api/pedidos/{id}/aprovar`: Aprova a etapa atual da alçada.
  ```json
  {
    "usuarioId": "uuid-usuario-aprovador",
    "observacao": "Aprovado conforme memorial de cálculo"
  }
  ```
- `POST /api/pedidos/{id}/rejeitar`: Rejeita o pedido com motivo obrigatório.
  ```json
  {
    "usuarioId": "uuid-usuario-aprovador",
    "motivo": "Preço unitário 15% acima da cotação de referência"
  }
  ```

---

## 🧪 Testes Automatizados

Foram implementados testes unitários cobrindo o motor de regras de alçada e a máquina de estados de pedidos:

```bash
# Na pasta backend:
npm test
```

**Cenários testados**:
- Determinação da regra correta de acordo com a faixa de valor.
- Retorno nulo e bloqueio quando não há regra aplicável.
- Validação de faixas de valores (máximo menor que mínimo).
- Rejeição de duplicação do mesmo usuário na mesma regra.
- Bloqueio de aprovação por usuário incorreto (tentativa de aprovação fora de ordem).
- Bloqueio de decisão em pedidos já finalizados ou rejeitados.
- Rejeição de submissão sem motivo obrigatório.

---

## 📈 O que Mudaria em Produção

Para escalar a solução em um ambiente enterprise com alto volume:

1. **Autenticação & RBAC (Role-Based Access Control)**:
   - Substituição do simulador de sessão por **Keycloak** ou **Auth0** com autenticação via JWT (*JSON Web Tokens*).
   - Validação de permissões por obra no nível do token/claim do usuário.
2. **Mensageria e Notificações Assíncronas**:
   - Integração com **RabbitMQ** ou **AWS SQS** para disparo de notificações em tempo real (e-mail, WhatsApp, push) para o próximo aprovador assim que uma etapa for concluída.
3. **Controle de Concorrência Otimista**:
   - Inclusão de campo `@version` no pedido para evitar condições de corrida (*race conditions*) caso dois aprovadores tentem submeter decisões concorrentes no mesmo milissegundo.
4. **Cache Distribuído**:
   - Uso de **Redis** para cache das regras de alçada por obra, invalidando o cache apenas sob mutações de regras.
5. **Observabilidade & Telemetria**:
   - Rastreamento distribuído com **OpenTelemetry**, logs estruturados em formato JSON com **Pino/Winston**, e monitoramento de métricas no **Prometheus/Grafana**.

---

## 👤 Identificação do Candidato

- **Candidato**: Landerson
- **Vaga**: Desenvolvedor Full-stack (ObraFlow)
- **Data da Entrega**: 01/11/2026
- **Contato / WhatsApp**: Disponível no descritivo do Pull Request.
