# Desafio Full-stack — ObraFlow (Fluxo de Aprovações)

Esta é a minha solução para o desafio técnico do ObraFlow. O objetivo é gerenciar **alçadas de aprovação** para pedidos de compra, garantindo controle financeiro e operacional em projetos de construção civil.

## 🚀 Como Executar a Solução

A aplicação está dividida em `backend` e `frontend`. Siga os passos abaixo para rodar o projeto localmente:

### Pré-requisitos
- **Node.js** (v18 ou superior)
- **npm** (ou yarn)

### 1. Configurar o Backend
```bash
cd backend
npm install
# Cria o banco de dados SQLite e aplica as migrações
npx prisma migrate dev --name init
# Alimenta o banco com dados de demonstração (Usuários, Obras e Regras)
npm run seed
# Inicia o servidor em modo de desenvolvimento (porta 3001)
npm run dev
```

### 2. Configurar o Frontend
```bash
cd frontend
npm install
# Inicia o servidor de desenvolvimento do Vite (porta 5173)
npm run dev
```

Após iniciar ambos, acesse: [http://localhost:5173](http://localhost:5173)

---

## 🛠 Tecnologias Escolhidas

### Backend
- **Node.js + TypeScript**: Para um desenvolvimento robusto com tipagem estática.
- **Express**: Framework ágil para construção da API REST.
- **Prisma ORM**: Escolhido pela excelente integração com TypeScript e facilidade na gestão de migrations.
- **SQLite**: Banco de dados relacional que dispensa instalação de servidores externos, facilitando a execução do desafio.
- **Zod**: Para validação rigorosa dos dados de entrada (schemas).

### Frontend
- **React + Vite**: Pela performance e ecossistema moderno.
- **Tailwind CSS**: Estilização rápida com foco em design responsivo e moderno.
- **TanStack Query (React Query)**: Gerenciamento eficiente de estados assíncronos e cache de API.
- **Lucide React**: Biblioteca de ícones leve e elegante.
- **Axios**: Cliente para comunicação simplificada com o backend.

---

## 🧠 Decisões Técnicas e Modelagem

### Modelagem de Alçadas
A estrutura foi desenhada para ser totalmente configurável:
1.  **ApprovalRule**: Define uma faixa de valor (`minValue` e `maxValue`) para uma obra específica.
2.  **ApprovalRuleLevel**: Permite que uma regra tenha múltiplos níveis sequenciais de aprovação.
3.  **RuleLevelApprover**: Define quais usuários têm autoridade para aprovar em cada nível específico.

### Lógica de Fluxo
- **Determinação Automática**: Ao criar um pedido, o backend identifica a regra correta baseada no valor total e na obra.
- **Aprovação Sequencial**: O sistema impede aprovações fora de ordem. Um nível só é liberado após a aprovação do anterior.
- **Rastreabilidade**: Todas as ações (aprovar/rejeitar) são gravadas no histórico com data, usuário e motivo (obrigatório em caso de rejeição).

### Consistência e Integridade
- **Atomicidade**: Uso de transações para garantir que o cabeçalho e os itens do pedido sejam salvos simultaneamente.
- **Validações**: Impedimento de pedidos sem itens, com quantidades negativas ou valores inválidos através de schemas Zod.

### O que mudaria em produção?
1.  **Autenticação**: Implementação de JWT (atualmente o usuário é simulado no frontend).
2.  **Banco de Dados**: Migração para **PostgreSQL** ou **MySQL**.
3.  **Testes**: Implementação de testes de integração no backend e E2E no frontend (Cypress/Playwright).
4.  **Monitoramento**: Integração com ferramentas de log (Sentry/Winston).

---

## 📸 Telas do Sistema

1.  **Dashboard de Pedidos**: Visualização clara de todos os pedidos e seus respectivos status na alçada.
2.  **Cadastro de Pedido**: Formulário inteligente com cálculo automático e validação de campos.
3.  **Configuração de Regras**: Gestão completa das faixas de valores e aprovadores por obra.

---
