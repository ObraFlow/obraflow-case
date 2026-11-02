# Colaboração, branches, agentes e skills

## Responsabilidades

| Papel                    | Responsabilidade                                         | Entregável                                     |
| ------------------------ | -------------------------------------------------------- | ---------------------------------------------- |
| Produto / negócio        | Resolver ambiguidades, priorizar e validar a experiência | Critérios, fluxos e exemplos de negócio        |
| Arquitetura / integração | Manter contratos e coerência; integrar mudanças          | Decisões, schema e plano de integração         |
| Implementação            | Entregar uma feature completa dentro do contrato         | UI + API + domínio + persistência + testes     |
| Revisão técnica / QA     | Procurar violações, falhas e problemas de uso            | Achados com evidência e regressões verificadas |

São papéis que podem ser desempenhados pela mesma pessoa em momentos distintos. Agentes auxiliam; a responsabilidade pelas decisões e pela entrega continua com o autor do projeto.

## Política de branches e PRs

- A integração local deve permanecer executável. Branch curta com prefixo conforme o tipo de trabalho: `feat/`, `fix/`, `chore/`, `docs/`, `test/` ou `refactor/`, seguido de um nome descritivo em kebab-case.
- Branches de feature seguem a tabela do plano; nenhuma branch permanente por agente, frontend, backend ou ambiente.
- Partir da branch de integração após incorporar dependências. Evitar uma cadeia longa de PRs empilhados.
- Uma feature grande pode ter subentregas verticais; descrever explicitamente o comportamento suportado em cada PR.
- Fazer commits pequenos e coerentes, por exemplo `feat(approvals): enforce current approver` ou `test(orders): cover fractional quantities`.
- Antes de integrar, atualizar com a branch de integração, resolver conflitos e executar os checks pertinentes.
- Definir a estratégia de integração antes de combinar as branches; não reescrever branch compartilhada sem coordenação.
- Mudanças de negócio, schema, dependências e configuração compartilhada precisam de revisão do integrador.
- PR deve informar problema, resultado, critérios atendidos, testes executados, screenshots de UI e limitações reais.
- Criação/publicação de PR e mensagens a outros chats dependem de instrução do usuário; não são consequência automática deste documento.

## Como usar múltiplos agentes

Usar agentes apenas com tarefa limitada, contrato claro e possibilidade de verificar o resultado. Paralelismo útil ocorre quando as dependências estão resolvidas. Não distribuir o mesmo problema indefinido para três implementações concorrentes.

Uma composição útil é: integrador conduz o fluxo; um agente implementa a feature; outro revisa regras e testes; outro revisa UI/produto. Não é necessário manter quatro agentes ativos o tempo inteiro.

### Ondas de trabalho

| Momento | Trabalho que pode ocorrer em paralelo                                           | Ponto de sincronização                     |
| ------- | ------------------------------------------------------------------------------- | ------------------------------------------ |
| F00     | Revisão de produto, riscos técnicos e rascunhos de telas                        | Contratos e decisões aceitos               |
| F01     | Ambiente/CI e especificação de testes sem editar arquivos comuns                | Aplicação mínima executável                |
| F03–F06 | Uma feature em implementação; revisão independente; cenários da próxima feature | PR integrado e contratos atualizados       |
| F07     | Auditoria de teclado/responsividade e revisão de integridade                    | Correções atribuídas a um dono por arquivo |
| F08     | Documentação, roteiro de demonstração e instalação limpa                        | Checklist completo                         |

Não dividir regras e pedidos em implementações simultâneas antes de estabilizar o contrato da alçada. Não deixar dois agentes alterarem schema.prisma, lockfile, configuração raiz ou seed ao mesmo tempo.

### Isolamento de arquivos

Branches não isolam arquivos dentro de um mesmo diretório. Agentes no mesmo checkout enxergam imediatamente as alterações uns dos outros, e mudar de branch afeta todos.

Padrão inicial: um agente escreve; os demais revisam sem editar. Implementações independentes simultâneas exigem worktrees separados e contratos já estabilizados, ou divisão explícita de arquivos sem sobreposição. Antes de criar worktree, verificar instruções locais e attachments existentes. Cada worktree deve ter ambiente, porta e banco de testes próprios quando necessário.

O integrador controla schema, migrations, dependências, lockfile, exports e configuração. Ao detectar colisão, parar a edição afetada e coordenar; não sobrescrever trabalho alheio nem executar reset destrutivo.

### Contrato de tarefa para um agente

```text
Feature / objetivo:
Contexto e decisões vigentes:
Dependências já integradas:
Arquivos permitidos e arquivos compartilhados proibidos:
Comportamento esperado / exemplos:
Critérios de aceite:
Testes e evidências exigidos:
O que está fora do escopo:
Formato de retorno: arquivos, decisões, checks, limitações e bloqueios.
Não criar requisitos novos nem modificar contratos silenciosamente.
```

### Contrato de revisão

Revisar diff e comportamento contra critérios, decisões e riscos. Dar prioridade a dados incorretos, autorização, ordem de aprovação, concorrência, rollback e regressão do fluxo. Cada achado precisa de localização, cenário reproduzível, consequência e severidade. Preferências pessoais de estilo não bloqueiam a entrega.

Uma revisão sem achados deve declarar o escopo verificado e suas limitações; não afirmar qualidade absoluta.

## Skills: uso e limites

Skill é um procedimento reutilizável; agente é um executor de uma tarefa. Uma skill ajuda a repetir o processo, mas não substitui critérios de negócio nem testes.

As skills personalizadas abaixo são propostas para uma etapa posterior. Não foram criadas, instaladas ou registradas por este plano. Se forem implementadas, usar a skill disponível `skill-creator`, seguindo seu SKILL.md e as instruções locais.

| Skill proposta           | Quando usar                         | Saída esperada                                                      |
| ------------------------ | ----------------------------------- | ------------------------------------------------------------------- |
| `obraflow-feature`       | Iniciar uma feature do backlog      | Contrato de tarefa, decisões afetadas, implementação e evidência    |
| `obraflow-domain-review` | Alterar alçadas, totais ou decisões | Revisão de invariantes, limites, transações e cenários de regressão |
| `obraflow-ui-review`     | Criar ou revisar telas              | Checklist de estados, hierarquia, acessibilidade e responsividade   |
| `obraflow-delivery`      | Preparar um marco ou entrega final  | Instalação limpa, checks, documentação e roteiro demonstrável       |

Não criar uma skill por tabela ou componente. Começar com os procedimentos escritos neste plano; empacotar quando houver repetição útil, mantendo referências para os contratos em vez de duplicá-los.

Skills já disponíveis que podem ajudar quando houver tarefa correspondente:

- `skill-creator`: criar e validar as skills de projeto propostas.
- `computer-use`: inspeção de interface via ferramentas suportadas, quando necessária.
- `figma` e suas skills específicas: somente se decidirmos criar/usar artefatos no Figma; não é pré-requisito deste desafio.

Não adicionar Figma, Sites, geração de imagens ou outros serviços apenas para aumentar o número de ferramentas. A UI pode ser desenhada diretamente no projeto.

## Boas práticas que precisam virar evidência

| Dimensão    | Prática                                        | Evidência na entrega                                 |
| ----------- | ---------------------------------------------- | ---------------------------------------------------- |
| Negócio     | Invariantes e ambiguidades resolvidas          | Decisões + testes de fronteira                       |
| Produto     | Cada ação explica estado e próximo responsável | Fluxos e screenshots com dados reais                 |
| Manutenção  | Módulos e domínio independentes da interface   | Testes de domínio sem runtime web                    |
| Integridade | Transações, constraints e controle de versão   | Testes de rollback e concorrência                    |
| Escala      | Paginação, consultas e índices adequados       | Consultas revisadas e cenário com volume             |
| Operação    | Configuração reproduzível e diagnóstico        | Compose, logs sem dados sensíveis e instalação limpa |
| Qualidade   | Verificação automática e revisão humana        | CI e checklist registrado                            |

## Roteiro da demonstração

1. Mostrar a regra de uma obra e explicar um valor no limite.
2. Criar pedido com itens e quantidade fracionária.
3. Mostrar total e cadeia efetivamente atribuída.
4. Demonstrar que o aprovador futuro não pode decidir.
5. Aprovar a primeira etapa e acompanhar a transição.
6. Rejeitar com motivo em outro pedido e mostrar o histórico.
7. Alterar uma regra e mostrar que pedidos antigos preservam sua cadeia.
8. Explicar uma decisão de arquitetura, um teste de concorrência e uma limitação da demonstração.

O diferencial é a coerência entre produto, código, testes e explicação. Nenhum item deve ser apresentado como pronto sem evidência.
