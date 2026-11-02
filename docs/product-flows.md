# Fluxos de produto e especificação das telas

Status: especificação de F00; descreve o comportamento a implementar, não comprova sua implementação. Referências: [enunciado](../README.md), [decisões](./decisions.md), [contrato de negócio](./domain-contract.md) e [contrato HTTP](./api-contract.md). Marcações F09 identificam melhorias condicionais fora do fluxo obrigatório inicial.

## Objetivo e limites

Permitir solicitar uma compra e acompanhar sua autorização pela cadeia correta da obra e do valor, com decisões rastreáveis. A experiência deve responder: quanto estou solicitando, quem precisa decidir e o que falta para concluir?

São três telas: novo pedido, aprovações com detalhes e regras por obra. Obras, usuários e fornecedores são dados existentes selecionáveis; sua manutenção visual não integra estas telas. Não há edição de pedido enviado, reabertura, notificações externas ou painel analítico neste fluxo.

## Navegação e linguagem

- Navegação principal persistente: **Aprovações**, **Novo pedido**, **Regras de alçada**. Destacar a seção atual por texto e marca visual.
- Cabeçalho: nome do produto e seletor **Usuário de demonstração**. Explicar brevemente que ele permite percorrer a cadeia de aprovação. Não apresentá-lo como autenticação segura.
- Aprovações é a entrada para explorar pedidos existentes. A ação primária **Novo pedido** também fica disponível nessa tela.
- Trocar o usuário atualiza as permissões e a fila. Fechar uma confirmação de decisão aberta para evitar enviar uma ação atribuída ao usuário anterior; preservar um cadastro ainda não enviado.
- Mostrar valores em BRL e formato brasileiro; data civil do pedido sem deslocamento de fuso. Identificar o fuso na apresentação dos instantes do histórico: America/Bahia.
- Situações visíveis: **Pendente**, **Aprovado** e **Rejeitado**. Não usar “cancelado” como sinônimo de rejeição. Aprovação intermediária mantém o pedido pendente.
- Uma ação principal por contexto. Cor acompanha texto e ícone; nunca é a única indicação de estado.
- Base visual: superfícies claras, texto escuro, azul para ação primária, verde para aprovado, âmbar para pendente e vermelho para rejeição/erro, sempre acompanhados por rótulos. Escala de espaçamento de 4/8 px; tipografia de sistema, corpo de 16 px e títulos claramente maiores. Verificar contraste na implementação antes de fixar tons finais.
- Identificador visível pode abreviar o UUID para os primeiros 8 caracteres, com acesso ao UUID completo para cópia; nunca usar a abreviação como chave de API ou assumir unicidade global dela.

## 1. Novo pedido

### Wireframe textual

```text
[Navegação]                                    [Usuário de demonstração v]
Novo pedido
Informe a compra; o total define a cadeia de aprovação.

Dados gerais
[Obra *                     v] [Fornecedor *                  v]
[Data do pedido *             ]
[Observações internas                                            ]

Itens do pedido                                [+ Adicionar item]
Descrição * | Quantidade * | Unidade * | Preço unitário * | Total
[Cimento ]  | [2,000]      | [un v]    | [R$ 40,00]       | R$ 80,00
                                                     [Remover item 1]
Erros aparecem junto ao campo correspondente.

Resumo da solicitação
1 item                                               Total R$ 80,00
Alçada prevista: Amanda
A cadeia será confirmada ao cadastrar o pedido.

[Cancelar]                                      [Cadastrar pedido]
```

### Comportamento e hierarquia

1. Dados gerais, itens e resumo seguem a ordem de preenchimento. Começar com um item vazio e rótulos sempre visíveis.
2. Obra, fornecedor, data, descrição e unidade são obrigatórios. Quantidade deve ser positiva, com até três casas decimais; preço deve ser não negativo, com até duas. Preço zero é válido. Explicar esses limites ao preencher, sem arredondar silenciosamente uma entrada com precisão excedente.
3. Cada item mostra total calculado, sem campo editável. Arredondar quantidade × preço para centavos por HALF_UP, depois somar os totais dos itens. Exemplo: 0,125 × R$ 0,04 resulta em R$ 0,01; dois desses itens somam R$ 0,02.
4. Adicionar item move o foco para sua descrição. Remover mantém os demais valores e transfere o foco para o item seguinte, anterior ou botão de adicionar. Se o último item for removido, mostrar “Adicione ao menos um item” e manter o envio indisponível.
5. O resumo destaca o total e a cadeia prevista, calculada sobre o total do pedido. Atualizar a prévia ao mudar obra ou itens válidos. Se houver campos de item inválidos, indicar que a prévia depende de concluir os itens, evitando exibir uma alçada aparentemente válida para um total incompleto.
6. Consultar as regras salvas da obra para a prévia. Cada faixa define a cadeia completa; tetos são inclusivos. A primeira faixa começa em zero; as demais começam acima do teto anterior; a última pode não ter teto.
7. Sem regra aplicável, mostrar no resumo: “Não há alçada configurada para este valor nesta obra”. Disponibilizar acesso a **Regras de alçada** e bloquear o cadastro. A regra precisa existir também para um pedido com total zero.
8. **Cadastrar pedido** só fica disponível com dados válidos, ao menos um item e regra prevista aplicável. A justificativa do bloqueio fica visível junto ao resumo; não depender de tooltip em botão desabilitado. Ao tentar avançar pelo formulário, levar o foco ao primeiro campo inválido.
9. Ao enviar, o servidor recalcula e confirma os valores e a configuração. Persistir pedido, itens e snapshot da cadeia em conjunto. A prévia não é uma garantia de que a configuração permanecerá igual até o envio.
10. Depois do sucesso, abrir o detalhe persistido com “Pedido cadastrado”, identificador, total e cadeia efetiva. Não permitir editar itens nem reenviar pelo botão Voltar do navegador.
11. Uma tentativa sem resultado confirmado preserva usuário solicitante, corpo e chave. Se o usuário de demonstração mudar, bloquear novo envio desse rascunho até reconciliar a tentativa com o ator original. Depois disso, permitir iniciar outra solicitação intencional. Não reutilizar silenciosamente a chave sob outra identidade.

### Estados

| Situação                       | Apresentação e recuperação                                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Carregando dados de seleção    | Placeholder ou indicador com rótulo; não apresentar seletor vazio como resultado final                                                                                                |
| Nenhuma obra ou fornecedor     | Estado vazio explicativo; cadastro indisponível; informar que os dados precisam ser cadastrados, sem link para uma tela inexistente                                                   |
| Carregando regras da obra      | “Consultando alçada”; preservar itens e bloquear cadastro até concluir                                                                                                                |
| Falha ao carregar dados/regras | Mensagem próxima da seção e **Tentar novamente**, preservando preenchimento                                                                                                           |
| Entrada inválida               | Erro no campo/item; mensagem clara; não enviar                                                                                                                                        |
| Enviando                       | “Cadastrando…”; impedir novo envio e mudanças nos campos durante a requisição                                                                                                         |
| Servidor rejeita a criação     | Preservar formulário, mostrar erro e atualizar a prévia quando pertinente; nunca mostrar sucesso antes da resposta                                                                    |
| Resposta de envio perdida      | Explicar que a confirmação não chegou; permitir tentar novamente com a mesma chave de idempotência e conteúdo. Replay não cria outro pedido; após resposta, consultar o detalhe atual |
| Sucesso                        | Abrir detalhe confirmado pelo servidor; feedback anunciado por tecnologia assistiva                                                                                                   |

Cancelar um formulário modificado exige confirmação de descarte. Falha de rede não deve limpar itens e observações.

## 2. Aprovações: lista e detalhe

### Wireframe textual da lista

```text
[Navegação]                                    [Usuário de demonstração v]
Aprovações                                             [+ Novo pedido]
[Todos os pedidos] [Aguardando minha decisão — F09]
[Situação v] [Obra v]                               [Limpar filtros]

Pedido | Obra / Fornecedor | Data | Itens | Total | Situação | Alçada
#104   | Obra Centro       | ...  | 3     | R$...| Pendente| Amanda → João
         Fornecedor A                            Atual: Amanda
                                                        [Ver detalhes]

[Anterior]                               Página 1              [Próxima]
```

### Wireframe textual do detalhe

```text
[Voltar à lista]
Pedido #55555555                                      [Pendente]
Obra Centro · Fornecedor A · Data do pedido
3 itens                                               Total R$ 12.500,00

Alçada do pedido
[Amanda — aguardando decisão] → [João — próxima etapa]
Esta é a cadeia atribuída quando o pedido foi cadastrado.

Itens
Descrição | Quantidade | Unidade | Preço unitário | Total
...
Observações internas
...

Histórico de decisões
Responsável · decisão · data e hora · motivo quando rejeitado
ou: Nenhuma decisão registrada.

Sua decisão: Amanda
[Rejeitar]                                                  [Aprovar]
```

### Comportamento e hierarquia

- Cada pedido exibe identificador, obra, fornecedor, data, quantidade de itens, total, situação e alçada. Distinguir etapas aprovadas, atual e futuras com rótulos explícitos.
- Na melhoria condicional F09, **Aguardando minha decisão** retorna apenas pedidos pendentes cuja etapa atual pertence ao usuário selecionado. A versão inicial oferece lista geral e filtros de obra/situação. Em todas as versões, um aprovador futuro não recebe a ação antecipadamente.
- Filtros e paginação mantêm ordem estável. Abrir um detalhe e voltar preserva o contexto da lista. Um resultado vazio após filtros oferece **Limpar filtros**.
- Detalhes podem ser uma rota própria para permitir acesso direto e bom uso em celular. Itens e observações são somente leitura; cadeia vem do snapshot do pedido, não da regra atual da obra.
- Habilitar ações apenas quando o usuário pode decidir a etapa atual. Nos demais casos, mantê-las desabilitadas e reservar uma área informativa: “Aguardando decisão de Amanda”, “Pedido aprovado; todas as etapas concluídas” ou “Pedido rejeitado; fluxo encerrado”. A explicação deve estar visível, inclusive em pedidos encerrados.
- **Aprovar** abre confirmação com identificador, total e consequência: encaminhar ao próximo aprovador ou concluir o pedido. **Rejeitar** abre confirmação com motivo obrigatório e indicação de que o fluxo será encerrado. Espaços em branco não constituem motivo válido.
- Durante a decisão, impedir novo envio; somente a confirmação do servidor altera situação, etapa e histórico. Após sucesso, atualizar detalhe e lista. A primeira aprovação não pode apresentar o pedido como aprovado se ainda houver etapas.
- Em conflito de versão ou estado, atualizar o detalhe e explicar “Este pedido foi atualizado. Confira a situação antes de decidir novamente”. Não repetir automaticamente uma decisão com a nova versão.
- Se outra pessoa já decidiu e a requisição falha, não inventar o resultado. Manter possibilidade de atualizar para consultar o estado persistido.
- No fluxo rejeitado, etapas posteriores aparecem como “Não executada — pedido rejeitado”; não como decisões de rejeição tomadas por esses aprovadores.

### Estados

| Situação                    | Apresentação e recuperação                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| Carregando lista ou detalhe | Skeleton com estrutura correspondente e texto acessível; não exibir “Nenhum pedido” durante carga |
| Sem pedidos                 | Explicar a lista e oferecer **Novo pedido**                                                       |
| Sem tarefas do usuário      | “Nenhum pedido aguarda sua decisão”; permitir acessar todos                                       |
| Sem resultado dos filtros   | Explicar e oferecer **Limpar filtros**                                                            |
| Falha de leitura            | Mensagem e **Tentar novamente**; preservar filtros                                                |
| Pedido inexistente          | “Pedido não encontrado” e link para lista                                                         |
| Sem histórico               | “Nenhuma decisão registrada”; cadeia inicial continua visível                                     |
| Enviando decisão            | Indicador na confirmação; bloquear novas ações concorrentes nessa interface                       |
| Rejeição sem motivo         | Erro junto ao campo; manter confirmação aberta                                                    |
| Falha de decisão            | Preservar motivo, mostrar mensagem e permitir consultar novamente antes de repetir                |
| Sucesso                     | Anunciar decisão e mostrar estado confirmado; se saiu da fila pessoal, explicar a mudança         |

## 3. Regras de alçada

### Wireframe textual

```text
[Navegação]                                    [Usuário de demonstração v]
Regras de alçada
Defina quem aprova compras em cada obra.
[Obra v]                                         Configuração salva v3

Faixa                                  Aprovadores na ordem
De R$ 0,00 até [R$ 10.000,00]           [Amanda] [↑ ↓ Remover]
                                        [+ Adicionar aprovador]
                                        [Remover faixa]
Acima de R$ 10.000,00 até [Sem teto]     [Amanda] [↑ ↓ Remover]
                                        [João] [↑ ↓ Remover]
                                        [+ Adicionar aprovador]
                                        [Remover faixa]
[+ Adicionar faixa]

Prévia dos intervalos após salvar
Até R$ 10.000,00: Amanda
Acima de R$ 10.000,00: Amanda → João
Pedidos já enviados mantêm a cadeia atribuída na criação.

Alterações não salvas                         [Descartar] [Salvar regras]
```

### Comportamento e hierarquia

1. Selecionar obra carrega a configuração salva e sua versão. Editar cria um rascunho local; adicionar, remover e reordenar não altera pedidos nem regras vigentes antes de **Salvar regras**.
2. Editar somente tetos; limites inferiores são derivados e exibidos em linguagem natural. A primeira faixa inclui zero; as demais excluem o teto anterior e incluem o próprio. A faixa sem teto só pode ser a última. Tetos finitos são não negativos, em centavos, únicos e crescentes.
3. Validar limites e cadeia por faixa antes do envio. Toda faixa precisa de ao menos um aprovador; impedir duplicidade de uma pessoa na mesma cadeia. A mesma pessoa pode participar de faixas diferentes.
4. Oferecer botões **Mover acima** e **Mover abaixo** com nomes acessíveis que incluam pessoa e faixa. Drag-and-drop, se existir no futuro, não substitui esses controles. A posição dos aprovadores é explícita.
5. Ao adicionar uma faixa finita, inseri-la antes da eventual faixa sem teto. Mostrar imediatamente os intervalos derivados. Não substituir silenciosamente uma cadeia existente ao reorganizar faixas.
6. Remover uma faixa pode ampliar o intervalo atendido pela faixa seguinte; mostrar essa consequência na prévia. Remover a última faixa finita sem sucessora pode deixar valores sem cobertura. A revisão antes de salvar deve explicitar os novos intervalos.
7. É permitido salvar uma configuração sem faixas para suspender novos pedidos nessa obra. Exigir confirmação clara: “Novos pedidos desta obra serão bloqueados por falta de alçada; pedidos existentes continuam com suas cadeias”. Não confundir essa ação com configuração inválida de uma faixa vazia.
8. **Salvar regras** envia o conjunto completo e a versão carregada. A substituição é atômica: todos os intervalos novos passam a valer juntos ou nenhum é salvo. A versão não é campo editável.
9. Em conflito com outra edição, preservar o rascunho para consulta, impedir sua sobrescrita silenciosa e oferecer carregar a configuração atual com confirmação de descarte. O usuário revê as alterações sobre a nova versão antes de salvar.
10. Após sucesso, atualizar a versão e remover a marca de alterações pendentes. **Descartar** restaura a configuração carregada. Troca de obra ou saída com mudanças pendentes exige confirmação de descarte; cancelar mantém obra e rascunho.

### Estados

| Situação             | Apresentação e recuperação                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------- |
| Sem obra selecionada | Orientar selecionar uma obra                                                                |
| Carregando regras    | Indicador da seção, sem mostrar rascunho de outra obra                                      |
| Nenhuma obra         | Estado vazio amigável; editor indisponível                                                  |
| Obra sem regras      | “Nenhuma alçada configurada”; **Adicionar faixa** e explicação do bloqueio de novos pedidos |
| Nenhum usuário       | Explicar que aprovadores precisam existir; salvar faixas incompletas indisponível           |
| Falha de leitura     | Mensagem e **Tentar novamente**; não trocar configuração por lista vazia                    |
| Rascunho inválido    | Erro no teto ou cadeia correspondente; preservar conteúdo                                   |
| Salvando             | “Salvando…”; impedir mudanças e novos envios até a resposta                                 |
| Falha ao salvar      | Preservar rascunho; não exibir sucesso nem mudar a versão                                   |
| Conflito de versão   | Explicar edição concorrente e oferecer recarregar mediante descarte explícito               |
| Sucesso              | “Regras salvas”; exibir versão confirmada e intervalos vigentes                             |

## Acessibilidade e responsividade

- Todos os fluxos operáveis por teclado, com ordem de foco acompanhando a leitura e foco visível. Rótulos associados aos campos; obrigatoriedade e erro expressos em texto. Associar descrições/erros ao campo e anunciar totais e status sem mover foco a cada digitação.
- Modais de confirmação recebem foco inicial apropriado, mantêm foco contido e retornam ao acionador ao fechar. Escape cancela quando não houver envio em andamento. A confirmação de rejeição nunca é acionada implicitamente ao apenas abrir o diálogo.
- Evitar controles de ação dependentes de hover. Botões de remoção identificam seu alvo; cabeçalhos de tabela e sequência de aprovação têm estrutura semântica.
- Em desktop, itens podem usar tabela e resumo lateral. Em celular, itens usam cartões com os mesmos rótulos e erros, resumo após os itens, e ações com área de toque confortável. Não reduzir campos a colunas ilegíveis.
- Lista de pedidos passa a cartões em telas estreitas, preservando todos os dados exigidos. Detalhe é uma coluna. Cadeia quebra linhas mantendo numeração e ordem; nome longo não oculta a etapa atual.
- Navegação reduzida conserva nomes acessíveis. Zoom e ampliação de texto não podem esconder campos, ações ou mensagens; evitar resumo fixo cobrindo o último item.

## Critérios de aceite transversais

- As três telas expõem claramente o próximo passo e todos os estados de carga, vazio, erro e sucesso aplicáveis.
- Uma falha não apaga rascunhos, itens ou motivo de rejeição; uma resposta ambígua não é apresentada como conclusão.
- Nenhuma decisão fora de ordem é permitida; a interface usa o estado persistido, e restrições também são verificadas no servidor.
- Total, faixa e cadeia apresentados após criação coincidem com os dados persistidos. Alterar regras não muda pedidos existentes.
- Regras só mudam após o salvamento do conjunto completo com versão; conflito não provoca perda silenciosa de edição.
- Usuário sem ação atual recebe uma explicação compreensível. Pedido encerrado não oferece alteração nem nova decisão.
- Na revisão de produto, conseguir completar cadastro, reordenação de aprovadores e decisão apenas com teclado e em viewport móvel.

## Mapa de comunicação esperado

Esta tabela orienta o fluxo visual; os detalhes dos payloads pertencem ao contrato da API.

| Interação                            | Comunicação                                                                                               |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Lista                                | `GET /api/orders`, com filtros e paginação definidos no contrato; fila pessoal é extensão condicional F09 |
| Criar pedido                         | `POST /api/orders`                                                                                        |
| Abrir/atualizar detalhe              | `GET /api/orders/:id`                                                                                     |
| Aprovar/rejeitar                     | `POST /api/orders/:id/decisions`, com versão esperada                                                     |
| Carregar regras e prévia do cadastro | `GET /api/projects/:id/approval-rules`                                                                    |
| Salvar configuração completa         | `PUT /api/projects/:id/approval-rules`, com versão esperada                                               |

As listas de obras, fornecedores e usuários usam os endpoints de cadastros definidos no contrato. A interface não exige endpoint separado de prévia nem presume que a cadeia vista no navegador substitua a decisão do servidor.

## Roteiro de exemplos para revisão

Configuração de referência: **Obra Centro**, até R$ 10.000,00 → Amanda; acima de R$ 10.000,00 → Amanda → João. **Obra Norte**, até R$ 5.000,00 → João, sem faixa ilimitada. Esses nomes são dados propostos para a demonstração.

| Cenário                 | Passos                                                             | Resultado observável                                                          |
| ----------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Limite inclusivo        | Criar na Obra Centro item de R$ 10.000,00                          | Prévia e cadeia persistida contêm somente Amanda                              |
| Um centavo acima        | Criar na Obra Centro R$ 10.000,01                                  | Cadeia Amanda → João; João ainda não pode decidir                             |
| Compra com vários itens | Dois itens de R$ 6.250,00                                          | Total R$ 12.500,00; alçada usa soma e exige duas etapas                       |
| Aprovação completa      | Amanda aprova R$ 12.500,00; trocar para João e aprovar             | Após Amanda permanece pendente; após João fica aprovado com duas decisões     |
| Rejeição                | Amanda abre rejeição, tenta motivo vazio e depois informa motivo   | Vazio impede envio; rejeição válida encerra, registra motivo e impede João    |
| Sem cobertura           | Tentar R$ 5.000,01 na Obra Norte                                   | Explicação junto ao resumo; cadastro indisponível                             |
| Arredondamento          | Dois itens com quantidade 0,125 e preço R$ 0,04                    | Cada total R$ 0,01; total R$ 0,02, igual ao servidor                          |
| Snapshot                | Criar pedido; depois alterar a cadeia da faixa e salvar            | Pedido existente mantém cadeia; novo pedido recebe configuração nova          |
| Rascunho de regras      | Remover faixa inferior sem salvar; inspecionar prévia; descartar   | Explica intervalo ampliado; regra vigente permanece inalterada                |
| Concorrência de regras  | Duas sessões carregam mesma versão; cada uma tenta salvar          | Primeira salva; segunda vê conflito com rascunho preservado e sem sobrescrita |
| Concorrência de decisão | Duas sessões abrem mesma etapa; uma aprova e outra tenta rejeitar  | Só uma decisão efetiva; a outra recebe atualização de estado                  |
| Recuperação             | Simular falha ao carregar lista e falha ao salvar formulário       | Tentar novamente disponível; dados preenchidos preservados                    |
| Telas vazias            | Revisar obra sem regras, lista filtrada vazia e fila pessoal vazia | Mensagens distintas com próximo passo apropriado                              |

Este roteiro é uma especificação para revisão e futura validação; sua presença não significa execução de testes nem implementação concluída.
