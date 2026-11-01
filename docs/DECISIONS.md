# Decisões técnicas

Este documento registra decisões arquiteturais e técnicas relevantes do projeto. Para cada decisão futura, anote a data, o contexto, a escolha e suas consequências. Atualize ou substitua entradas quando o projeto mudar de direção.

## Decisões adotadas

### 2026-10-27 — Organização do repositório

- **Contexto:** manter frontend e backend organizados e executáveis no mesmo projeto.
- **Decisão:** separar o código nos diretórios `backend/` e `frontend/`.
- **Consequências:** cada camada mantém suas dependências e comandos próprios; a documentação deve explicar como iniciar a solução completa.

### 2026-10-27 — Stack principal

- **Contexto:** escolher tecnologias familiares e adequadas ao desafio full-stack.
- **Decisão:** usar Java 21 com Spring Boot e Maven no backend; Vue 3 com TypeScript, Vite para desenvolvimento e build, e npm no frontend.
- **Consequências:** versionar Maven Wrapper e lockfile do npm, e documentar os comandos necessários para desenvolvimento, build e execução.

### 2026-10-27 — Persistência e execução local

- **Contexto:** persistir pedidos e seu fluxo de aprovação com integridade, permitindo execução local sem serviços pagos ou credenciais externas.
- **Decisão:** usar PostgreSQL, gerenciar alterações de esquema com Flyway e fornecer Docker Compose para a execução local.
- **Consequências:** alterações persistentes devem ser entregues por migrações reproduzíveis; a configuração local deve usar valores de desenvolvimento e variáveis de ambiente quando apropriado.

### 2026-10-27 — Comunicação entre as camadas

- **Contexto:** permitir que a aplicação Vue consuma as operações do backend.
- **Decisão:** usar uma API HTTP REST com payloads JSON.
- **Consequências:** documentar endpoints, formatos de dados e erros no README; validar no backend todas as entradas e regras de negócio.

### 2026-10-27 — Testes

- **Contexto:** reduzir regressões e desenvolver cada fluxo com comportamento verificável.
- **Decisão:** adotar TDD, com JUnit 5 no backend e Vitest no frontend.
- **Consequências:** cada fluxo deve começar por testes do comportamento esperado e concluir com a execução dos testes relevantes.

### 2026-10-27 — Desenvolvimento por fluxo

- **Contexto:** manter mudanças pequenas e revisar cada capacidade de ponta a ponta.
- **Decisão:** implementar um fluxo por vez, incluindo backend e frontend, em branch e worktree próprios. Criar branches a partir de `obraflow-challenge` e integrá-las de volta a essa branch ao concluir o fluxo.
- **Consequências:** usar nomes curtos em inglês com prefixos convencionais, como `feature/order-creation`, `fix/approval-order` e `docs/local-setup`.

### 2026-10-27 — Commits

- **Contexto:** facilitar revisão e entendimento do histórico.
- **Decisão:** seguir mensagens de commit focadas e uma convenção reconhecível, preferencialmente Conventional Commits; mensagens em português são permitidas.
- **Consequências:** cada commit deve descrever sua intenção e evitar misturar mudanças independentes.

### 2026-10-28 — Faixas de alçada e ausência de configuração

- **Contexto:** a seleção da alçada na criação do pedido precisa ser inequívoca para qualquer valor, e configurações incompletas não podem produzir uma cadeia imprevisível.
- **Decisão:** representar valores não negativos com faixas `[mínimo, máximo)`, com mínimo inclusivo e máximo exclusivo. A configuração de cada obra deve iniciar em zero, ser contígua, sem sobreposições, e terminar em uma faixa sem limite superior. Cada faixa exige ao menos um aprovador ativo e ordenado. Obra sem configuração não pode receber pedido; a Fase 2 deve bloquear a criação com erro claro.
- **Consequências:** a API salva atomicamente o conjunto ordenado de faixas; a interface permite editar o conjunto e rejeita lacunas, sobreposições ou ausência de aprovadores. Valores exatamente no limite pertencem à faixa seguinte.

### 2026-10-29 — Precisão monetária e fotografia da alçada do pedido

- **Contexto:** pedidos precisam exibir e persistir valores iguais em todas as camadas, e mudanças posteriores nas regras não podem reescrever decisões já iniciadas.
- **Decisão:** aceitar quantidade com até três casas decimais e preço unitário com até duas; arredondar cada total de item para duas casas pelo método `HALF_UP` e somar os totais arredondados. No cadastro, persistir em uma transação a faixa selecionada pelo total do pedido e uma fotografia ordenada de IDs e nomes/e-mails dos aprovadores.
- **Consequências:** o frontend usa aritmética decimal inteira para apresentação, enquanto o backend recalcula todos os valores; alterações de faixa afetam somente novos pedidos. A Fase 3 deverá consumir a cadeia persistida sem consultar novamente a regra vigente.

### 2026-10-29 — Transições de aprovação e histórico auditável

- **Contexto:** decisões precisam avançar uma única etapa por vez, encerrar em aprovação/rejeição e permanecer consultáveis mesmo após mudanças nas regras.
- **Decisão:** persistir a posição atual no pedido e cada decisão em uma tabela própria com posição, usuário, identidade congelada, resultado, instante e motivo. Aprovação e atualização do estado ocorrem em uma transação que bloqueia a linha do pedido; rejeição exige motivo e encerra a cadeia.
- **Consequências:** requisições concorrentes são serializadas e decisões repetidas, fora de ordem ou após o encerramento não gravam eventos. Como o desafio não inclui autenticação, o ator é informado por `approverId` e validado contra a etapa atual; produção deve derivá-lo da identidade autenticada.

### 2026-10-30 — Carga explícita dos dados de demonstração

- **Contexto:** a avaliação precisa de cadastros, regras e pedidos em estados representativos, enquanto a inicialização normal e ambientes externos não devem receber dados artificiais.
- **Decisão:** fornecer um `CommandLineRunner` ativado somente pelo perfil Spring `demo-data`, executado explicitamente contra o PostgreSQL local do Docker Compose. Cadastros são reconhecidos por chaves naturais estáveis e pedidos por marcadores próprios nas observações; a carga roda em uma transação e não exclui registros.
- **Consequências:** repetir o comando não duplica os exemplos e a aplicação não popula dados automaticamente. Para reconstruir a base local do zero, o volume do Compose pode ser removido e a carga executada novamente.
