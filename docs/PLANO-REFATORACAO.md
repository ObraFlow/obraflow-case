# Análise e plano de refatoração

**Escopo:** estrutura atual após as Fases 0 e 1; preparar a base para iniciar a Fase 2 (cadastro de pedidos), sem alterar requisitos ou regras de negócio. Esta análise complementa os SDDs e as decisões em [`DECISIONS.md`](DECISIONS.md).

## Resumo

Há espaço claro para separar responsabilidades no backend e dividir a tela de regras e o acesso HTTP no frontend. A mudança deve ser incremental, preservando os endpoints e comportamentos da Fase 1 e adicionando testes de caracterização onde necessário.

Para este desafio, a recomendação é **manter JDBC**. O domínio atual tem operações SQL explícitas e transacionais, e o tamanho do modelo ainda não justifica introduzir ORM. A separação entre controller, serviço e repositório pode ser feita sem JPA. Reavaliar JPA só se o domínio e as consultas evoluírem a ponto de o mapeamento de entidades reduzir complexidade real.

O trabalho de refatoração deve ser concluído e integrado antes da Fase 2. Não é necessário criar camadas ou abstrações sem um caso de uso concreto.

## Refatoração do backend

### Diagnóstico

- `ReferenceController` concentra endpoints de obras, usuários, fornecedores e faixas; declara DTOs; acessa `JdbcTemplate`; valida entradas; coordena persistência e transação; e converte erros. Isso torna difícil testar cada responsabilidade isoladamente e aumenta o custo de acrescentar os fluxos de pedido.
- `loadBands` carrega as faixas e consulta os aprovadores separadamente para cada faixa. Além de misturar consulta e montagem de resposta no controller, isso gera consultas N+1.
- A regra de faixa já está em `ApprovalBandSet`, uma classe de domínio independente. É uma boa separação a manter e ampliar apenas quando uma regra nova exigir.
- `HealthController` também executa SQL diretamente. A verificação de saúde pode usar um serviço pequeno ou o health indicator do Spring Boot para o banco, evitando lógica de infraestrutura no controller e respostas duplicadas.
- As migrações já impõem chaves, unicidade e limites importantes. Essa proteção no banco deve continuar junto das validações de aplicação.
- Há testes de domínio, API e tela, mas os testes de API atuais cobrem apenas campos obrigatórios e obra inexistente. A extração das camadas precisa preservar os comportamentos já documentados e cobrir as principais transições e falhas dos endpoints existentes.

### Estrutura recomendada

Organizar primeiro por funcionalidade e manter as responsabilidades legíveis dentro de cada funcionalidade. Por exemplo:

```text
com.obraflow
  health/
    HealthController
    HealthService (se necessário)
  reference/
    work/       WorkController, WorkService, WorkRepository, DTOs
    user/       UserController, UserService, UserRepository, DTOs
    supplier/   SupplierController, SupplierService, SupplierRepository, DTOs
    approval/   ApprovalBandController, ApprovalBandService, ApprovalBandRepository, DTOs
  rules/
    ApprovalBandSet (regra de domínio)
  shared/
    error/      ApiExceptionHandler, erros de aplicação
```

Essa organização evita um pacote global enorme de `controllers/`, `services/` e `repositories/` à medida que as fases adicionarem funcionalidades. Se a equipe preferir uma organização por camada neste projeto pequeno, manter os pacotes de feature juntos é mais importante do que criar muitos subpacotes vazios.

Responsabilidades propostas:

- **Controller:** mapeia HTTP, recebe DTOs, aplica validação de formato e delega ao serviço; transforma o resultado em resposta HTTP. Sem SQL, coordenação de persistência ou regras de negócio.
- **Service:** executa o caso de uso, aplica regras de aplicação, coordena repositórios e define a fronteira transacional. A substituição completa das faixas deve permanecer atômica.
- **Repository:** encapsula SQL e mapeamento de linhas. Um repositório pode usar `JdbcTemplate` e consultas explícitas; não precisa simular um ORM genérico.
- **DTOs:** requests e responses explícitos, fora do controller. Não expor tipos internos do domínio como contrato HTTP. Usar Bean Validation (`@Valid`, `@NotBlank`, limites de tamanho e validação de e-mail) para validações estruturais; manter regras entre campos e de negócio no domínio/serviço.
- **Domínio:** preservar `ApprovalBandSet` como validação pura e sem dependência de Spring. Evitar torná-lo uma entidade JPA apenas para encaixar uma convenção.
- **Erros:** centralizar o formato HTTP em `@RestControllerAdvice`, idealmente com `ProblemDetail` do Spring. Traduzir erros de validação, recurso inexistente, conflito de unicidade e regra de negócio para status e mensagens consistentes, sem SQL ou stack traces.

Não é preciso criar interface para cada repository por princípio. Introduzir interfaces quando houver uma segunda implementação, uma fronteira útil para testes, ou uma necessidade concreta de domínio; hoje o uso direto de classes repository é suficiente.

### JDBC ou JPA

**Manter JDBC nesta etapa.**

JDBC é adequado para o código existente porque o conjunto de consultas é pequeno, o SQL é direto, há uso explícito de `RETURNING`, e o endpoint de faixas requer substituição transacional ordenada. JDBC deixa essas operações visíveis e não impõe mapeamento de relações, ciclo de vida de entidades, lazy loading ou configuração de cascatas.

JPA poderia reduzir SQL repetido em operações CRUD simples, mas não torna a arquitetura limpa por si só. Neste modelo com coleções ordenadas e consultas de resposta agregada, ainda seria necessário controlar consultas, transações e carregamento para evitar N+1. Adotar JPA agora misturaria uma mudança arquitetural ampla com a criação do fluxo de pedidos, sem benefício demonstrado.

Para melhorar o JDBC atual:

1. mover SQL e RowMappers para repositories;
2. substituir a montagem N+1 de faixas por uma consulta agregada/por lote e montar o resultado fora do controller;
3. manter parâmetros vinculados, limites e constraints nas migrações;
4. testar a atomicidade da substituição e o mapeamento de dados usando PostgreSQL nos testes de persistência quando disponível.

Reavaliar JPA depois de haver mais fluxos e consultas reais, comparando a complexidade total e não a popularidade do padrão.

### Plano de execução do backend

1. **Caracterizar o comportamento existente:** ampliar testes para cadastro/listagem, validações, obra inexistente, leitura de faixas, aprovadores ordenados e substituição atômica. Preservar endpoints e payloads atuais.
2. **Extrair contratos HTTP:** mover records de request/response para DTOs de feature. Introduzir validação Bean Validation para campos simples e deixar regras compostas no domínio/serviço.
3. **Extrair persistência:** criar repositories JDBC por funcionalidade e mover para eles consultas, comandos e mapeamento de resultados, incluindo a otimização de carregamento das faixas.
4. **Extrair casos de uso:** criar serviços de referência e de faixas. Colocar `@Transactional` no serviço de substituição e remover orquestração do controller.
5. **Padronizar erros e saúde:** adicionar handler global com respostas consistentes; decidir se `/api/health` continua como contrato próprio e delega a verificação ou se o frontend passa a consultar Actuator. Não manter dois contratos com semântica divergente.
6. **Revisar persistência e configuração:** conferir constraints e índices com os casos de uso existentes; centralizar configurações tipadas somente quando houver mais de uma propriedade relacionada. Evitar migrações sem necessidade funcional.
7. **Documentar e integrar:** atualizar README e `DECISIONS.md` se a arquitetura/persistência mudar; executar verificações backend e registrar resultados antes de iniciar a Fase 2.

## Refatoração do frontend

### Diagnóstico

- `RulesView.vue` concentra estado, chamadas `fetch`, tradução de erros, operações de edição, formatação monetária e a tela inteira. O template também contém várias áreas funcionais em um único componente, dificultando manutenção e testes focados.
- `App.vue` mistura shell da aplicação com consulta e estados de saúde. Para o tamanho atual isso é aceitável, mas o acesso HTTP repetido e a apresentação de status podem ser extraídos sem adicionar um framework de estado.
- Os tipos da API estão locais aos componentes e não há cliente HTTP comum. Isso tende a duplicar configuração de URL, headers e interpretação de erros quando os pedidos forem adicionados.
- A tela atende estados de carregamento, vazio e erro e possui testes Vitest, mas a lógica de adicionar/remover faixas, seleção/ordenação de aprovadores, erros de envio e mudança de obra deve ficar mais simples de cobrir quando for extraída.
- A aplicação ainda é pequena. Não há justificativa atual para Pinia, router, arquitetura de design system ou camadas genéricas de hooks.

### Estrutura recomendada

Manter o frontend organizado por funcionalidade e deixar componentes reutilizáveis em `shared` somente quando houver reutilização real:

```text
src/
  app/                 shell e inicialização da aplicação
  features/
    health/             consulta e indicador de saúde
    approval-rules/     API, tipos, estado de tela e componentes de regras
    reference-data/     cadastros de obras e usuários, se crescerem além dos formulários atuais
  shared/
    api/                cliente HTTP e erro de API
    components/         componentes usados em mais de uma feature
    formatters/         formatação compartilhada, se necessária
  main.ts
  style.css
```

Não é necessário mover tudo em uma única mudança. A separação por feature deve acompanhar o crescimento real e os componentes devem ser extraídos quando tiverem uma responsabilidade visual/funcional independente.

Responsabilidades propostas:

- **Cliente API:** centralizar `baseURL`, headers, serialização e conversão de respostas não-2xx em erro tipado. Não esconder erros nem obrigar todos os endpoints a retornar JSON quando houver resposta sem corpo.
- **Tipos de API:** separar contratos do servidor dos modelos de edição da tela; mapear o DTO de aprovadores para a seleção ordenada usada pelo editor.
- **Composables por fluxo:** encapsular carregamento, salvamento, estados e ações da feature de regras, mantendo componentes focados em apresentação e interação. Não criar composable só para envolver uma função trivial.
- **Componentes:** separar formulários de cadastro e editor de faixa/aprovadores quando isso reduzir tamanho e permitir testes de componente claros. Manter rótulos, mensagens, foco visível e teclado.
- **Regras de edição:** extrair operações puras de faixas (adicionar/remover e manter limites contíguos) para funções testáveis; o backend continua sendo a autoridade para aceitar a configuração.
- **Estados remotos:** manter loading, erro recuperável, estado vazio e sucesso visíveis. Distinguir erro ao carregar de erro ao salvar; não exibir sucesso se o recarregamento após salvar falhar.
- **Estado compartilhado:** manter estado local enquanto as telas não compartilharem dados complexos. Adotar Pinia apenas se múltiplas rotas precisarem coordenar estado persistente entre si.

### Plano de execução do frontend

1. **Caracterizar os fluxos atuais:** reforçar testes para estados de erro/vazio, seleção de obra, operações de faixa e aprovadores, payload ordenado e retorno de falha ao salvar.
2. **Criar cliente HTTP e contratos:** extrair URL, `fetch` e leitura de erros; manter tipos explícitos e testar a conversão de respostas de erro.
3. **Separar estado da feature:** mover carregamento e mutações de regras para um composable/use case pequeno, garantindo estados independentes de carregamento e salvamento.
4. **Dividir a interface:** extrair formulário de cadastro e editor de faixas/aprovadores se a divisão melhorar legibilidade; manter `RulesView` como composição da feature.
5. **Organizar saúde e shell:** separar a consulta/indicador de saúde do layout global, sem exigir router enquanto houver uma única tela principal.
6. **Padronizar qualidade:** configurar lint e formatação TypeScript/Vue com ferramentas compatíveis com a stack já instalada, se o custo de manutenção for baixo; documentar os comandos no README. Não adicionar biblioteca de estado ou UI por padrão.
7. **Verificar e integrar:** executar testes Vitest e build TypeScript/Vite, revisar acessibilidade/responsividade tocada pela extração e atualizar documentação antes da Fase 2.

## Sequência sugerida antes da Fase 2

1. Criar uma branch/worktree própria a partir de `obraflow-challenge`, conforme o fluxo do repositório.
2. Concluir a caracterização por testes e então refatorar backend e frontend em passos pequenos, preservando os contratos da Fase 1.
3. Manter JDBC e evitar dependências arquiteturais sem necessidade. Registrar nova decisão somente se a decisão de persistência ou contrato mudar.
4. Atualizar README e SDDs somente nos pontos afetados, executar testes e builds relevantes, integrar a refatoração em `obraflow-challenge` e só então começar a Fase 2.

## Fora do escopo desta proposta

- Reescrever a persistência em JPA sem evidência de que isso simplifica o domínio.
- Introduzir microserviços, arquitetura hexagonal completa, CQRS, event sourcing, Pinia ou design system antes de uma necessidade concreta.
- Alterar regras de alçada, payloads ou endpoints da Fase 1 durante uma extração puramente estrutural.
- Antecipar a implementação do cadastro, cálculo e persistência de pedidos, que pertencem à Fase 2.
