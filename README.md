# ObraFlow · Dokimos

Pedidos de compra com aprovação sequencial por obra e valor. O solicitante acompanha cada etapa; o aprovador encontra o que precisa decidir; as regras mudam sem reescrever a história dos pedidos existentes.

Implementação do [desafio original](docs/challenge.md), preservado integralmente. Stack: Next.js, React, TypeScript, Tailwind, PostgreSQL e Prisma. Execução local sem serviços pagos ou credenciais externas.

## Iniciar

Com Docker Engine ativo e Docker Compose instalado, na raiz do projeto:

```sh
docker compose up --build --wait
```

Abrir [localhost:3000](http://localhost:3000). O Compose aguarda o banco, aplica migrations, executa o seed e inicia a aplicação. Portas 3000 e 5432 publicadas apenas no loopback.

O seed repetível cria duas obras, três usuários, dois fornecedores, três faixas e quatro pedidos em estados diferentes. Não reseta configurações nem decisões existentes. Credenciais locais: usuário `obraflow`, senha `obraflow_local`, banco `obraflow`. `docker compose down` para os serviços sem apagar o volume.

Para desenvolvimento no host: Node.js 24.11+ da linha 24 e npm 11. Copiar `.env.example` para `.env` e executar:

```sh
npm ci
docker compose up -d db
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

## Experimentar

1. Em **Aprovações**, explore pedidos e históricos.
2. Como **Lucas**, crie um pedido na Obra Centro com um ou mais itens.
3. Até R$ 10.000,00, Amanda é a única aprovadora. Acima disso, Amanda decide antes de João.
4. Troque para Amanda e aprove; depois para João para concluir uma cadeia de duas pessoas.
5. Rejeite outro pedido com motivo e confira o encerramento.
6. Edite uma regra e compare um pedido antigo com um novo: a cadeia antiga permanece.

Na Obra Norte, até R$ 5.000,00 basta João; valores acima não têm cobertura e o cadastro é bloqueado. Preço zero é permitido. O total usa todos os itens, arredondados individualmente.

O seletor de usuário demonstra a autorização por etapa. **Não é autenticação segura.** Cadastros básicos podem ser criados pela API, sem telas administrativas adicionais.

## Telas

![Pedidos e alçadas](docs/screenshots/orders.png)

| Novo pedido                                           | Regras por obra                                  |
| ----------------------------------------------------- | ------------------------------------------------ |
| ![Cadastro com itens](docs/screenshots/new-order.png) | ![Editor de alçadas](docs/screenshots/rules.png) |

[Detalhes e histórico](docs/screenshots/order-detail.png) · [Versão móvel](docs/screenshots/mobile.png)

## Testar

```sh
npm run check
```

Executa geração do client, lint, tipos, testes unitários e build. Integração e navegador usam banco separado terminado em `_test`; o runner recusa o banco de desenvolvimento antes de migrations.

Criar o banco de testes uma vez, caso ainda não exista:

```sh
docker compose exec -T db createdb -U obraflow obraflow_test
```

Confirmar `TEST_DATABASE_URL` em `.env`, conforme `.env.example`:

```sh
npm run test:integration
npx playwright install chromium
npm run test:e2e
```

E2E prepara dados, gera o build e inicia servidor temporário na porta 3100. Não executar integração e E2E simultaneamente no mesmo banco. Diagnósticos de falha em `test-results/`. CI repete os checks em PostgreSQL efêmero; execução remota depende do envio ao repositório.

## API

Header obrigatório: `X-Demo-User-Id`. Lucas no seed: `66666666-6666-4666-8666-666666666666`.

| Método     | Rota                                                           | Uso                                    |
| ---------- | -------------------------------------------------------------- | -------------------------------------- |
| GET / POST | `/api/projects`, `/api/users`, `/api/suppliers`                | Listar/cadastrar referências           |
| GET        | `/api/projects/{id}`, `/api/users/{id}`, `/api/suppliers/{id}` | Consulta individual                    |
| GET / PUT  | `/api/projects/{id}/approval-rules`                            | Ler/substituir configuração com versão |
| GET / POST | `/api/orders`                                                  | Listar/cadastrar pedidos               |
| GET        | `/api/orders/{id}`                                             | Itens, etapas, permissões e histórico  |
| POST       | `/api/orders/{id}/decisions`                                   | Aprovar/rejeitar etapa atual           |
| GET        | `/api/health`                                                  | Prontidão operacional, sem header demo |

Exemplo PowerShell:

```powershell
$headers = @{ 'X-Demo-User-Id' = '66666666-6666-4666-8666-666666666666' }
Invoke-RestMethod 'http://localhost:3000/api/orders?page=1&pageSize=20' -Headers $headers
```

POST de pedido também exige `Idempotency-Key` UUID. Mesma chave, solicitante e conteúdo não criam outro pedido. Dinheiro e quantidades são strings decimais. [Payloads, paginação e erros](docs/api-contract.md).

## Decisões técnicas

- **Monólito modular:** rotas tratam HTTP; serviços coordenam transações; domínio calcula e valida. Módulos de cadastros, regras e pedidos mantêm responsabilidades claras sem infraestrutura distribuída.
- **PostgreSQL + Prisma:** migrations, FKs, posições únicas, decisão única por etapa, CHECKs e índice parcial para uma faixa sem teto. O SQL complementar precisa ser preservado nas migrations futuras.
- **Faixas completas:** escolher o menor teto inclusivo compatível, ou faixa final ilimitada. Sem cobertura, não há pedido. Cada faixa define toda a cadeia, resolvendo a ambiguidade do enunciado.
- **Histórico:** pedido guarda versão, teto e etapas próprias com nomes copiados. Editar/remover regras não altera pedidos existentes; decisões não são editáveis pela API.
- **Integridade:** configuração e criação bloqueiam a mesma obra. Decisão usa versão/estado condicionais e histórico na mesma transação. Leituras compostas usam snapshot consistente. Testes exercitam concorrência real.
- **Dinheiro:** Decimal no servidor e inteiros de precisão fixa na prévia. HALF_UP por item, seguido da soma. Totais são recalculados no backend.
- **Comunicação:** HTTP JSON com erros por campo, retry de leitura e atualização após mutações. Cadastro incerto mantém corpo, ator e chave. Decisões conflitantes exigem nova leitura.
- **UI:** componentes locais e formulários controlados por React, com Tailwind/CSS e Zod no servidor. O escopo não exigiu design system externo, gerenciador global de estado ou biblioteca adicional de formulários.
- **Manutenção/escala:** paginação, filtros no servidor, índices, pool limitado, transações curtas e dependências fixadas. Busca por prefixo de UUID é uma conveniência; maior volume exigiria avaliar índice/plano específico.

Em produção: autenticação e papéis reais, isolamento por empresa se exigido, backups com restauração testada, métricas, gestão de conexões/segredos, migrations compatíveis com deploy e retenção de idempotência/histórico. Notificações exigiriam jobs/outbox; não há necessidade demonstrada de microserviços. Auditoria da aplicação não protege contra administradores do banco.

## Organização

[Plano](docs/delivery-plan.md) · [Decisões](docs/decisions.md) · [Negócio/modelo](docs/domain-contract.md) · [Fluxos](docs/product-flows.md) · [Agentes](docs/collaboration.md) · [Operação](docs/development.md)

Features são registradas em commits e merges locais na branch de entrega. Consulte `git log --graph --oneline --decorate`.
