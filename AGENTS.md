# OptMem

Antes de fazer qualquer outra coisa neste projeto, você deve ler `OPTMEM.md` na raiz do projeto e seguir suas instruções.

# Instruções de desenvolvimento

Este arquivo orienta agentes de IA e colaboradores durante o desenvolvimento. O `README.md` é a fonte dos requisitos do desafio; consulte-o antes de alterar o comportamento da aplicação. Não duplique seus requisitos aqui.

## Stack e estrutura

- Separe a aplicação em `backend/` e `frontend/`.
- Backend: Java 21, Spring Boot e Maven. Mantenha o Maven Wrapper versionado e use-o nos comandos documentados.
- Frontend: Vue 3 com TypeScript, Vite para desenvolvimento e build, e npm. Mantenha o lockfile versionado.
- Banco de dados: PostgreSQL. Gerencie o esquema e sua evolução com migrações Flyway.
- Use Docker Compose para oferecer uma forma reproduzível de iniciar os serviços locais.
- Use uma API HTTP REST com JSON para a comunicação entre frontend e backend, salvo decisão posterior registrada em `docs/DECISIONS.md`.
- Mantenha código, configuração e documentação de cada camada no diretório correspondente. Evite dependências desnecessárias entre camadas.

## Decisões técnicas

- Registre decisões arquiteturais e técnicas relevantes em `docs/DECISIONS.md`, incluindo data, contexto, decisão e consequências quando aplicável.
- Consulte esse documento antes de propor uma mudança que contradiga uma decisão existente.
- Atualize-o quando uma decisão for tomada, substituída ou deixar de se aplicar. Não registre nele detalhes triviais de implementação.
- Ao mudar comportamento, comandos, configuração ou arquitetura, atualize também o README ou a documentação pertinente.

## Fluxo de desenvolvimento

- Desenvolva um fluxo de produto por vez. Cada fluxo deve incluir sua parte de backend e frontend, além de persistência e documentação necessárias.
- Trabalhe em uma branch e worktree próprios para cada fluxo. Crie branches a partir de `obraflow-challenge`; ao concluir e verificar o fluxo, integre-o de volta nessa branch antes de iniciar outro fluxo dependente.
- Use nomes de branch em inglês, curtos e descritivos, com prefixos convencionais: `feature/`, `fix/`, `refactor/` ou `docs/`. Exemplo: `feature/order-creation`.
- Não misture mudanças sem relação com o fluxo em andamento. Preserve alterações preexistentes do usuário.

## TDD e qualidade

- Adote TDD: escreva primeiro um teste que descreva o comportamento esperado e falhe; implemente o mínimo necessário para fazê-lo passar; depois refatore e execute novamente os testes relevantes.
- Backend: use JUnit 5 e as ferramentas de teste fornecidas pelo Spring. Frontend: use Vitest para testes unitários e de componentes.
- Antes de concluir um fluxo, execute os testes e verificações de qualidade relevantes para as áreas alteradas. Informe claramente comandos executados e resultados.
- Prefira soluções simples, coesas e legíveis. Aplique SOLID, DRY, YAGNI e KISS com bom senso; evite abstrações prematuras e duplicação relevante.
- Não deixe testes desabilitados, ignorados ou frágeis para contornar falhas de implementação.

## Integridade e segurança

- Trate toda entrada externa como não confiável. Valide campos obrigatórios, formatos, limites e regras de negócio no backend, mesmo que o frontend também valide para orientar o usuário.
- O backend é a fonte de verdade para cálculos, totais, seleção de alçada, ordem de aprovação e transições de estado. Não confie em totais ou decisões enviados pelo cliente.
- Use transações e restrições apropriadas para preservar integridade e consistência entre pedidos, itens, regras e histórico.
- Não exponha detalhes internos, dados sensíveis ou stack traces em respostas de erro. Retorne erros consistentes e úteis para o cliente.
- Não inclua credenciais, tokens ou segredos no repositório. Use variáveis de ambiente e mantenha um `.env.example` apenas com valores fictícios e nomes das configurações necessárias.
- Evite SQL concatenado, renderização insegura de conteúdo, dependências sem necessidade e configurações inseguras por padrão. Não implemente autenticação fora do escopo sem registrar a decisão.

## Frontend e experiência de uso

- Represente estados de carregamento, sucesso, vazio e erro nas telas que dependem de dados remotos.
- Mostre validações junto aos campos relevantes e erros da API em linguagem clara; não esconda falhas de envio.
- Use elementos semânticos, rótulos associados aos campos, foco visível e controles utilizáveis por teclado. Mantenha a interface responsiva.
- Evite duplicar regras de negócio complexas no frontend. A validação local deve complementar, não substituir, a validação do backend.

## Commits

- Faça commits pequenos, focados e com mensagens no imperativo, que expliquem a intenção da mudança.
- Siga uma convenção reconhecível, preferencialmente Conventional Commits (por exemplo, `feat: criar cadastro de pedidos`). As mensagens podem ser escritas em português.
- Não inclua arquivos temporários, segredos, artefatos de build ou alterações alheias ao fluxo no commit.
