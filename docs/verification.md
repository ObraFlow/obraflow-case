# Verificação da entrega

Data: 20/10/2026. Branch de integração: `feat/obraflow-delivery`.

## Escopo

| Feature | Resultado                                                            |
| ------- | -------------------------------------------------------------------- |
| F00     | Contratos, decisões, fluxos e modelo documentados                    |
| F01     | Ambiente, PostgreSQL, migrations, seed base e CI                     |
| F02     | Cadastros via API, seleção de identidade demo e navegação            |
| F03     | Editor de faixas e aprovadores com versão, conflitos e confirmação   |
| F04     | Cadastro com N itens, cálculo decimal, snapshot e idempotência       |
| F05     | Lista paginada, detalhes, etapas e histórico                         |
| F06     | Decisões sequenciais, motivo obrigatório e concorrência              |
| F07     | Estados, teclado, responsividade, formatação e checks                |
| F08     | Cenários de demonstração, instalação e screenshots                   |
| F09     | Fila pessoal, busca por prefixo, resumo da página e prévia da cadeia |

## Checks

- Formatação Prettier, ESLint sem warnings e TypeScript com tipos de rotas gerados.
- 62 testes unitários: entrada, cálculos, limites, contratos, normalização, isolamento do banco de teste e equivalência dos totais entre cliente/servidor.
- 23 testes de integração em PostgreSQL: cadastros, configurações, rollback, constraints, snapshots, idempotência concorrente, decisões concorrentes e seed atômico.
- 7 jornadas Playwright/Chromium: formulário real → aprovação sequencial; rejeição com motivo; erro e retry de lista; resposta perdida depois do commit e recuperação sem duplicação; edição/reordenação/remoção de regras; erros HTTP; capturas e responsividade.
- Capturas desktop em 1440 px e layout sem transbordamento global em 360, 768 e 1440 px. Menu móvel operável por Enter/Escape, foco devolvido ao acionador e links fechados fora da ordem de Tab.
- Build de produção e execução standalone. Imagens da documentação derivam de dados persistidos, sem mocks de produto.
- Instalação Compose verificada também com projeto, rede e volume temporários novos: as três migrations foram aplicadas em banco vazio e o seed criou quatro pedidos, com dois pendentes em etapas diferentes, um aprovado e um rejeitado. A aplicação principal permaneceu em localhost:3000; a instância de verificação usou a porta 3102 e foi removida após as capturas.

Os testes de erro de lista usam interceptação HTTP para provocar a falha controlada. O teste de resposta perdida faz a chamada real ao servidor, interrompe apenas sua entrega ao navegador e comprova um único pedido após retry com chave/ator/conteúdo originais.

O teste de seed provoca falta de cobertura na terceira fixture e verifica que as anteriores não foram confirmadas. Após restaurar a regra, uma nova execução conclui os cenários; repetições não desfazem uma decisão posterior do avaliador.

## Operação e limites

- Testes usam PostgreSQL dedicado, nunca o banco de demonstração. O guard é executado antes das migrations.
- CI configurado; execução remota e criação/publicação de PR não fazem parte desta verificação local.
- Identidade demo é manipulável; autenticação de produção, papéis administrativos e isolamento multiempresa não foram implementados.
- Acessibilidade verificada pelos controles nativos, foco e jornadas principais; não foi realizada certificação WCAG ou auditoria completa com tecnologias assistivas.
- Sem teste de carga ou promessa de capacidade. Paginação, filtros SQL, índices e transações curtas constituem a base para medir e evoluir.
- O driver pg 8 emite um aviso de depreciação quando Prisma carrega relações na mesma conexão. As operações e os testes passam; atualizar driver/adapter em conjunto antes de adotar pg 9, sem suprimir o aviso nem atualizar versões major automaticamente.
- Skills personalizadas permanecem propostas. Os procedimentos e papéis estão em collaboration.md; não há instalação implícita de ferramentas pessoais.

## Reprodução

```sh
npm run check
npm run test:integration
npm run test:e2e
docker compose up --build --wait
```

Pré-requisitos e criação do banco de teste em [Desenvolvimento](./development.md). Roteiro de produto e endpoints no [README](../README.md).
