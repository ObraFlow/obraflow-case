# Registro inicial de decisões

Status: decisões de implementação definidas na F00 em 20/10/2026. Este documento não comprova implementação. Detalhes normativos em [contrato de negócio](./domain-contract.md), [contrato HTTP](./api-contract.md) e [fluxos](./product-flows.md). Registrar mudanças com data e justificativa; separar em ADRs individuais quando o volume justificar.

## D01 — Monólito modular

Uma aplicação Next.js + TypeScript com API HTTP em Route Handlers e PostgreSQL. Prisma para persistência e migrations. Um processo de aplicação e um banco, executáveis localmente por Docker Compose.

Módulos: pedidos, aprovações, regras e cadastros. Rotas traduzem HTTP; serviços coordenam casos de uso e transações; funções de domínio calculam e validam comportamentos; acesso ao banco permanece no servidor. Não criar interface de repository para cada tabela sem necessidade.

Custo: frontend e API compartilham implantação. Benefício: menos coordenação operacional para uma equipe pequena e fronteiras de negócio explícitas. Validar por fluxo completo e facilidade de testar o domínio sem Next.js.

## D02 — Faixas explícitas e não cumulativas

Cada faixa guarda sua cadeia completa e ordenada. A cadeia não é inferida pela soma de aprovadores das faixas anteriores. Isso resolve a inconsistência entre os exemplos iniciais do enunciado.

Representação escolhida: limites superiores inclusivos e crescentes, sem sobreposição. Para tetos de 10.000 e 50.000: primeira faixa [0; 10.000], segunda (10.000; 50.000]. Uma faixa final opcional sem teto cobre valores maiores que o último limite. Tetos finitos não negativos e únicos por obra.

Selecionar o menor teto que comporte o total; na ausência, usar a faixa sem teto se existir. Sem correspondência, bloquear criação. Ausência da faixa final permite teto de compras explícito. Total zero é permitido se houver ao menos um item válido e regra correspondente.

Validar: limite exato, um centavo acima, zero, teto único, ausência de regras e faixa ilimitada.

## D03 — Cadeia atribuída e história preservada

Pedido recebe cópia ordenada dos aprovadores na criação, com referência à configuração/versão de origem. Etapas e histórico permanecem mesmo se a regra for editada ou removida. Identificadores de usuários referenciados não podem ser apagados em cascata.

Atualização de regras por obra é atômica e serializada contra criação de pedido para essa obra, com SELECT FOR UPDATE na mesma linha da obra antes de ler regras/versão. PUT substitui a configuração e incrementa versão. Pedido criado durante uma alteração usa uma configuração completa anterior ou posterior. Implementar e testar em F03/F04.

Histórico de decisões é append-only pelos casos de uso da aplicação; não existe edição/exclusão pública de decisões. Isso é rastreabilidade da aplicação, não garantia de auditoria inviolável contra administradores do banco.

## D04 — Valores e datas

Escolha: quantidade decimal com até 3 casas, preço unitário em BRL com até 2 casas e total por item arredondado para centavos por HALF_UP. Somar os totais já arredondados para obter o total do pedido. Esses limites são escolhas do projeto, não exigências do enunciado.

Usar aritmética decimal no servidor e tipos NUMERIC no PostgreSQL. Na API, valores decimais são strings; não converter para ponto flutuante para cálculos. Limites máximos de quantidade, preço, itens e texto estão definidos em domain-contract.md, com validação antes da persistência.

Data do pedido é uma data civil YYYY-MM-DD, armazenada como DATE. Instantes de decisão são timestamps com fuso, transmitidos em ISO 8601 e apresentados no fuso definido para a demonstração. Nenhuma restrição a data futura foi solicitada; não inventá-la sem decisão de produto.

## D05 — Estado e concorrência

Pedido: PENDING → APPROVED ou REJECTED. Uma aprovação intermediária mantém PENDING e avança a etapa atual. Pedido encerrado não pode ser reaberto ou editado nesta entrega.

Versão do pedido implementa concorrência otimista. Dentro de uma transação: ler estado, validar usuário/etapa/versão, atualizar condicionalmente pela versão, registrar decisão, atualizar etapa e concluir. Se a atualização não afetar o registro esperado, reverter e responder conflito. Constraint impede mais de uma decisão por etapa.

O cliente atualiza os dados após conflito. Repetição de decisão é recusada sem novo efeito; replay idempotente de decisão não é promessa inicial. Criação de pedido usa Idempotency-Key por solicitante, claim transacional e hash normalizado: mesmo conteúdo retorna a resposta original, conteúdo diferente gera conflito. Política completa em domain-contract.md.

Aplicar integridade também no banco: FKs, posição única por cadeia, decisão única por etapa, quantidade positiva e valores não negativos onde expressáveis. Alterações SQL adicionais devem integrar migrations versionadas. Testar aprovação versus aprovação e aprovação versus rejeição simultâneas: apenas uma decisão efetiva vence.

## D06 — Identidade de demonstração

Seletor de usuário permite avaliar a cadeia sem credenciais externas. API resolve um usuário válido e valida se ele corresponde à etapa atual. Identidade demo é manipulável e não equivale a autenticação segura.

Documentar a limitação na aplicação/README de forma adequada à avaliação. Permissões administrativas e autenticação real são evolução para produção; o enunciado não define papéis administrativos. Não apresentar o sistema como pronto para exposição pública com esse mecanismo.

## D07 — Contrato e erros

API HTTP JSON, contratos validados no servidor com Zod e reutilizáveis no cliente quando não importarem dependências de servidor. Prisma não é o contrato público; DTOs delimitam campos expostos.

Erro com código estável, mensagem, erros por campo quando aplicável e identificador da requisição. 400 entrada inválida, 403 decisão não permitida, 404 recurso ausente, 409 conflito de estado/configuração, 413 corpo excessivo, 415 tipo de mídia inválido e 500 falha inesperada. Não expor stack ou detalhes internos no cliente.

Listas paginadas e com ordem estável. A interface refaz leitura após mutações; estado de decisão nunca é presumido apenas pelo cliente. Endpoints, payloads e paginação estão definidos em api-contract.md.

## D08 — Manutenibilidade e operação

- Dependências entram quando resolvem uma necessidade identificável; versões compatíveis e lockfile versionado.
- Domínio determinístico, módulos pequenos, nomes ligados ao negócio e ausência de regra duplicada em rotas/componentes.
- Configuração de ambiente validada no startup; segredos fora do Git.
- Logs estruturados com identificador de requisição e duração, sem observações internas ou motivos completos por padrão.
- Migrações revisadas e não destrutivas; seed explícito e seguro para execução repetida.
- CI com lint, tipos, testes de domínio/integração e build; E2E das jornadas críticas antes do merge de mudanças relacionadas.

## D09 — Escalabilidade proporcional

Inicialmente: paginação, consultas com campos necessários, evitar N+1, transações curtas e índices orientados às consultas de pedidos por obra, status, data e aprovador atual. Confirmar índices pelo modelo e plano de consulta, sem criá-los por adivinhação.

Aplicação sem estado de negócio em memória, permitindo múltiplas instâncias no futuro. Identidade demo não deve depender de variável global compartilhada. Limites de conexão e pool precisam acompanhar o modo de implantação.

Evolução condicionada a evidência: métricas e planos de consulta antes de cache; autenticação e autorização antes de exposição real; backup com restauração verificada; migrações compatíveis com deploy; jobs/outbox apenas se houver notificações; multiempresa apenas com modelo de isolamento definido. Microserviços exigiriam motivo operacional concreto.

## Fechamento das decisões de F00

| Questão | Decisão | Impacto |
|---|---|---|
| Precisão e limites máximos | Quantidade 3 casas, máximo 1 milhão; preço 2 casas, máximo 1 milhão; total máximo 100 milhões | Schema, formulários e cálculo |
| Pedido repetido após falha de rede | Idempotency-Key obrigatória por solicitante; replay da resposta original | Contrato HTTP e persistência |
| Limites de payload e itens | 256 KiB e 1–100 itens; textos limitados no contrato | Segurança, UX e desempenho |
| Configuração editada simultaneamente | Versão por obra, lock compartilhado com criação e conflito explícito | Integridade das regras |
| Exclusão de faixa intermediária | Intervalo derivado se expande na seguinte; prévia e confirmação antes de salvar | Comportamento do editor |
| Edição do pedido | Sem edição após envio na primeira entrega | Imutabilidade de valores e cadeia |
| Campos mínimos de cadastros | Nome de 1–120 caracteres; ID e createdAt gerados no servidor | Evitar requisitos inventados |

Antes de F01, verificar compatibilidade das versões concretas das dependências e o ambiente disponível. São escolhas de execução, sem alterar estes contratos. Os testes da implementação deverão comprovar as decisões aqui registradas.
