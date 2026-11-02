![Banner do desafio ObraFlow](assets/banner.png)

# ObraFlow

Solução full-stack desenvolvida para o desafio técnico da **ObraFlow**. O sistema implementa a gestão de pedidos de compra e o serviço de **alçadas de aprovação**, garantindo controle financeiro, trilha de auditoria e regras configuráveis por obra.

---

## Sumário

- [Visão Geral e Telas](#visão-geral-e-telas)
- [Decisões técnicas](#decisões-técnicas)
  - [Tecnologias Escolhidas e Motivos da Escolha](#1-tecnologias-escolhidas-e-motivos-da-escolha)
  - [Como a Regra de Alçada é Modelada, Calculada e Persistida](#2-como-a-regra-de-alçada-é-modelada-calculada-e-persistida)
  - [Comunicação Front-end e Back-end](#3-comunicação-front-end-e-back-end)
  - [Consistência e Integridade dos Dados](#4-consistência-e-integridade-dos-dados)
  - [O que Mudaria em Produção](#5-o-que-mudaria-em-produção)
- [Como Executar o Projeto Localmente](#como-executar-o-projeto-localmente)
- [Documentação da API (Endpoints e Payloads)](#documentação-da-api-endpoints-e-payloads)
- [Testes Automatizados](#testes-automatizados)

---

## Visão Geral e Telas

A interface foi projetada com foco em hierarquia visual clara, sobriedade e tratamento de todos os estados exigidos (*loading*, *empty state*, validações por campo/item e *error banner* com opção de nova tentativa):

1. **Listagem e Aprovação de Pedidos (`/pedidos`)**:
   - Tabela com código identificador, obra, fornecedor, data de emissão, quantidade de itens, valor total e situação (*Pendente*, *Aprovado* ou *Rejeitado*).
   - Coluna **Alçada Atual** exibindo aprovadores concluídos, aprovador da etapa atual e próximos aprovadores na fila.
   - Ações diretas de **Aprovar** e **Rejeitar** disponíveis para o aprovador da vez, além do botão **Detalhes**.
   - **Drawer lateral de detalhes**: lista completa dos itens do pedido (descrição, quantidade, unidade, preço unitário e total), *stepper* da cadeia de aprovação e histórico cronológico de decisões. Quando a alçada já foi concluída ou pertence a outro aprovador, os botões de decisão ficam desabilitados acompanhados da explicação contextual.

2. **Cadastro de Pedido de Compra (`/pedidos/novo`)**:
   - Dados gerais: seleção de obra, fornecedor, data de emissão e observações internas opcionais.
   - Tabela dinâmica de **N itens**: inicia com um item em branco e permite adicionar, editar e remover itens com cálculo em tempo real do total de cada item (`quantidade × preço unitário`) e do total geral do pedido.
   - Validações por campo e por item (impedindo quantidades/preços inválidos ou negativos e pedidos sem itens). O botão **Cadastrar Pedido** permanece desabilitado até que o cabeçalho e todos os itens sejam válidos.

3. **Configuração de Regras de Alçada (`/regras`)**:
   - Seleção de obra para configuração independente das faixas de valor.
   - Listagem das regras salvas exibindo a faixa financeira e a sequência de aprovadores (`1º Aprovador → 2º Aprovador`).
   - Criação, edição e exclusão de faixas de valor, permitindo adicionar, remover e reordenar aprovadores (`Subir` / `Descer`).

> **Simulação de Aprovadores**: No cabeçalho superior da aplicação, o seletor **Usuário** permite alternar rapidamente entre os usuários cadastrados (João Silva, Amanda Oliveira, Carlos Mendonça e Fernanda Costa) para testar a aprovação sequencial nível a nível.

---

## Decisões técnicas

### 1. Tecnologias Escolhidas e Motivos da Escolha

| Camada | Tecnologia | Motivo da Escolha |
|---|---|---|
| **Back-end** | **NestJS (Node.js + TypeScript)** | Arquitetura modular com injeção de dependência nativa, separação clara de responsabilidades (Controllers, Services, DTOs), validação declarativa via `class-validator` e geração automática de documentação OpenAPI/Swagger. |
| **ORM** | **Prisma ORM** | Tipagem estática gerada a partir do schema, migrações versionadas e suporte simples e seguro a transações atômicas (`prisma.$transaction`). |
| **Banco de Dados** | **PostgreSQL 16** | SGBD relacional com suporte ACID completo, tipos numéricos de precisão exata (`DECIMAL(12, 2)` para valores monetários e `DECIMAL(10, 3)` para quantidades) e constraints de integridade referencial. |
| **Front-end** | **Angular 21 (Standalone + Zoneless)** | Framework estruturado para aplicações corporativas e ERPs, utilizando `ReactiveFormsModule` com `FormArray` para validação dinâmica de múltiplos itens e detecção de mudanças reativa (`provideZonelessChangeDetection`) com locale `pt-BR`. |
| **Infraestrutura** | **Docker Compose** | Provisionamento isolado e reprodutível do banco PostgreSQL com um único comando, sem depender de serviços externos. |

---

### 2. Como a Regra de Alçada é Modelada, Calculada e Persistida

#### Modelagem
- **`RegraAlcada`**: Vinculada a uma `Obra`, possui `valorMinimo` (`DECIMAL(12,2)`) e `valorMaximo` (`DECIMAL(12,2)`, anulável para representar faixas sem limite superior, ex.: *"Acima de R$ 50.000,00"*).
- **`RegraAlcadaAprovador`**: Define os usuários aprovadores de uma regra e sua `ordem` sequencial (`1, 2, ...`). Possui constraints `@@unique([regraAlcadaId, ordem])` e `@@unique([regraAlcadaId, usuarioId])` no banco para impedir ordens duplicadas ou o mesmo usuário repetido na mesma regra.
- **`PedidoAprovacao`**: Ao criar um pedido, o sistema gera um *snapshot* das etapas de aprovação vinculadas ao pedido. Isso garante que alterações futuras nas regras da obra não corrompam pedidos já emitidos ou em andamento.
- **`PedidoHistorico`**: Tabela *append-only* que preserva a trilha de auditoria (`CRIADO`, `APROVADO`, `REJEITADO`), registrando usuário, data/hora e motivo/observação.

#### Cálculo e Determinação da Cadeia
1. No envio do pedido (`POST /api/pedidos`), o back-end recalcula o total de cada item e a soma total do pedido (`valorTotal`).
2. O serviço `RegrasAlcadaService.determinarAlcada(obraId, valorTotal)` consulta a regra aplicável para a obra onde:
   - `valorMinimo <= valorTotal`
   - `valorMaximo IS NULL OR valorMaximo >= valorTotal`
3. **Comportamento para valores sem regra aplicável**: Caso a obra não possua regra configurada que cubra o `valorTotal` do pedido, a criação é recusada com `400 Bad Request` e mensagem explicativa informando a obra e o valor sem cobertura, orientando o cadastro da faixa correspondente.
4. Encontrada a regra, o pedido é salvo com `status = PENDENTE`, `nivelAtualOrdem = 1` e todas as etapas geradas em `PedidoAprovacao`.

#### Avanço de Nível e Rejeição
- **Aprovação (`POST /api/pedidos/:id/aprovar`)**: Verifica se o pedido está `PENDENTE` e se o `usuarioId` informado corresponde exatamente ao aprovador da etapa `nivelAtualOrdem`. Decisões fora de ordem são bloqueadas com `403 Forbidden`. Quando aprovado, se houver próxima etapa (`ordem + 1`), `nivelAtualOrdem` é incrementado; caso contrário, o pedido passa para `APROVADO` e `nivelAtualOrdem = null`.
- **Rejeição (`POST /api/pedidos/:id/rejeitar`)**: Exige motivo obrigatório (validado no front-end e no DTO do back-end). Marca a etapa atual como `REJEITADO`, interrompe imediatamente o fluxo (`status = REJEITADO`, `nivelAtualOrdem = null`) e grava o motivo no pedido e no histórico.

---

### 3. Comunicação Front-end e Back-end

- Comunicação via API REST JSON sobre HTTP consumida pelo `ApiService` do Angular (`HttpClient`).
- Contratos tipados de ponta a ponta: DTOs validados com `ValidationPipe` (`whitelist: true`, `transform: true`) no NestJS e interfaces TypeScript espelhadas no Angular (`models.ts`).
- Tratamento centralizado de erros HTTP, exibindo as mensagens de negócio retornadas pela API diretamente nos componentes de feedback visual.

---

### 4. Consistência e Integridade dos Dados

1. **Transações Atômicas (`prisma.$transaction`)**:
   - Criação do pedido + inserção dos N itens + criação das etapas de alçada + registro no histórico executam em uma única transação ACID.
   - Aprovação e rejeição atualizam a etapa, o cabeçalho do pedido e o histórico de auditoria atomicamente.
   - Edição de regras substitui a cadeia de aprovadores de forma transacional.
2. **Recálculo Server-Side**: O back-end nunca confia em totais enviados pelo cliente; todos os subtotais e o valor total do pedido são calculados no servidor antes de determinar a alçada e persistir.
3. **Integridade Referencial e Precisão Monetária**: Chaves estrangeiras com políticas de deleção apropriadas (`Cascade` para itens/etapas do pedido, `Restrict` para entidades mestras) e uso de `DECIMAL` no PostgreSQL para evitar erros de ponto flutuante.

---

### 5. O que Mudaria em Produção

1. **Autenticação e Autorização Reais**: Substituição do seletor de sessão simulado por autenticação via JWT/OAuth2 (ex.: Keycloak ou Auth0), extraindo a identidade do aprovador diretamente do token assinado em um `Guard` do NestJS.
2. **Controle de Concorrência Otimista**: Adição de coluna de versão (`version`) na tabela de pedidos para prevenir condições de corrida em aprovações simultâneas.
3. **Notificações Assíncronas**: Publicação de eventos em fila (RabbitMQ / SQS) a cada mudança de etapa para envio de e-mail ou WhatsApp ao próximo aprovador da fila.
4. **Versionamento Imutável de Regras**: Em vez de atualizar regras in-place, criar novas revisões de regra para manter rastreabilidade histórica de auditoria das próprias políticas de alçada.
5. **Paginação Server-Side e Índices Adicionais**: Paginação por cursor/offset na listagem de pedidos e filtros por período e fornecedor.

---

## Como Executar o Projeto Localmente

### Pré-requisitos
- **Node.js** (v18+)
- **Docker** e **Docker Compose** (para o banco PostgreSQL)

### 1. Instalar Dependências

Na raiz do projeto:

```bash
npm install --prefix backend
npm install --prefix frontend
```

### 2. Iniciar o Banco de Dados PostgreSQL

Na raiz do projeto:

```bash
docker compose up -d
```

> O arquivo `backend/.env` já está configurado por padrão apontando para `postgresql://postgres:postgres@127.0.0.1:5432/obraflow?schema=public`. Caso não esteja presente, copie `backend/.env.example` para `backend/.env`.

### 3. Executar Migrações e Popular Dados de Demonstração (Seed)

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
npm run seed
```

O seed cria dados completos para avaliação imediata:
- **2 Obras**: *Residencial Horizonte Azul* e *Edifício Metrópole Tower*.
- **4 Usuários**: *João Silva* (Engenheiro Residente), *Amanda Oliveira* (Gerente de Obras), *Carlos Mendonça* (Diretor de Operações) e *Fernanda Costa* (Coordenadora de Suprimentos).
- **3 Fornecedores**: *Votorantim Cimentos*, *Gerdau Aços Longos* e *Tigre Materiais e Tubulações*.
- **5 Regras de Alçada** distribuídas entre as duas obras (faixas até R$ 10.000, de R$ 10.000 a R$ 50.000 e acima de R$ 50.000).
- **3 Pedidos de Compra em estados distintos**:
  - `PED-2026-0001`: **PENDENTE** (R$ 13.300,00 — aguardando João Silva na Etapa 1/2, seguido por Amanda Oliveira).
  - `PED-2026-0002`: **APROVADO** (R$ 7.450,00 — cadeia concluída).
  - `PED-2026-0003`: **REJEITADO** (R$ 49.000,00 — aprovado na 1ª etapa por João Silva e rejeitado na 2ª etapa por Amanda Oliveira com motivo registrado).

### 4. Iniciar o Back-end

Em um terminal (na raiz ou dentro de `backend/`):

```bash
npm run start:backend
# ou dentro de backend/: npm run start:dev
```
- **API**: `http://localhost:3000/api`
- **Swagger UI**: `http://localhost:3000/api/docs`

### 5. Iniciar o Front-end

Em outro terminal (na raiz ou dentro de `frontend/`):

```bash
npm run start:frontend
# ou dentro de frontend/: npm start
```
- **Aplicação Web**: `http://localhost:4200`

---

## Documentação da API (Endpoints e Payloads)

A documentação interativa completa pode ser consultada no Swagger em `http://localhost:3000/api/docs`.

### Cadastros Base (Obras, Usuários e Fornecedores)

- `GET /api/obras` | `GET /api/obras/:id` | `POST /api/obras`
  ```json
  {
    "nome": "Residencial Parque das Águas",
    "localizacao": "Curitiba - PR",
    "orcamento": 8500000
  }
  ```
- `GET /api/usuarios` | `GET /api/usuarios/:id` | `POST /api/usuarios`
  ```json
  {
    "nome": "Roberto Almeida",
    "email": "roberto.almeida@obraflow.com.br",
    "cargo": "Engenheiro Orçamentista"
  }
  ```
- `GET /api/fornecedores` | `GET /api/fornecedores/:id` | `POST /api/fornecedores`
  ```json
  {
    "razaoSocial": "Amanco Wavin Brasil",
    "cnpj": "11.222.333/0001-44",
    "contato": "comercial@amanco.com.br"
  }
  ```

### Regras de Alçada

- `GET /api/regras-alcada?obraId={obraId}`: Lista as regras configuradas para a obra ordenadas por faixa de valor.
- `GET /api/regras-alcada/:id`: Consulta detalhes de uma regra específica.
- `POST /api/regras-alcada`: Cria uma nova regra de alçada com cadeia ordenada de aprovadores.
  ```json
  {
    "obraId": "uuid-da-obra",
    "descricao": "Compras acima de R$ 10.000,00",
    "valorMinimo": 10000.01,
    "valorMaximo": null,
    "aprovadores": [
      { "usuarioId": "uuid-joao", "ordem": 1 },
      { "usuarioId": "uuid-amanda", "ordem": 2 }
    ]
  }
  ```
- `PUT /api/regras-alcada/:id`: Atualiza limites de valor, descrição e reordenação de aprovadores.
- `DELETE /api/regras-alcada/:id`: Remove uma regra de alçada.

### Pedidos de Compra e Fluxo de Aprovação

- `GET /api/pedidos?obraId={obraId}&status={PENDENTE|APROVADO|REJEITADO}`: Lista pedidos com resumo da alçada (`aprovadoresConcluidos`, `aprovadorAtual`, `proximosAprovadores`).
- `GET /api/pedidos/:id`: Retorna o pedido com todos os itens, etapas de aprovação e histórico de auditoria.
- `POST /api/pedidos`: Cria um pedido com N itens, calcula os totais e gera a cadeia inicial de aprovação.
  ```json
  {
    "obraId": "uuid-da-obra",
    "fornecedorId": "uuid-do-fornecedor",
    "dataPedido": "2026-11-01",
    "observacoes": "Material para etapa de fundação",
    "itens": [
      {
        "descricao": "Cimento CP II 50kg",
        "quantidade": 100,
        "unidade": "sc",
        "precoUnitario": 38.50
      }
    ]
  }
  ```
- `POST /api/pedidos/:id/aprovar`: Registra aprovação da etapa atual e avança o nível da alçada.
  ```json
  {
    "usuarioId": "uuid-do-aprovador-atual",
    "observacao": "Valores dentro do orçamento previsto."
  }
  ```
- `POST /api/pedidos/:id/rejeitar`: Rejeita o pedido com motivo obrigatório e encerra o fluxo.
  ```json
  {
    "usuarioId": "uuid-do-aprovador-atual",
    "motivo": "Fornecedor sem prazo de entrega compatível com o cronograma."
  }
  ```

---

## Testes Automatizados

O back-end conta com testes unitários automatizados via **Jest** cobrindo o motor de regras de alçada, o fluxo sequencial de aprovação/rejeição e o health check da API:

```bash
npm run test:backend
# ou dentro de backend/: npm test
```
