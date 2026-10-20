# F00 — Contrato de negócio e modelo

Status: definido em 20/10/2026 como contrato de implementação. Não representa funcionalidade já construída. Mudanças futuras devem atualizar contrato HTTP, critérios e testes relacionados.

## Atores e fronteiras

- Solicitante: usuário de demonstração que cria pedidos e acompanha o resultado.
- Aprovador: usuário atribuído à etapa atual; pode aprovar ou rejeitar essa etapa.
- Configurador: na demonstração, qualquer usuário selecionado pode manter regras e cadastros. Não há papéis administrativos reais nesta versão.

Obras possuem configurações independentes. Não há isolamento multiempresa. Fornecedor e obra devem existir antes do pedido. Usuários, obras e fornecedores possuem apenas cadastro e consulta nesta entrega; sua exclusão não é exposta.

## Dados e limites

Todos os limites abaixo são escolhas do projeto para uma demonstração verificável. Não são regras adicionais atribuídas ao enunciado.

| Campo                              | Contrato                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| IDs                                | UUID; gerados no servidor, exceto a chave de idempotência gerada pelo cliente  |
| Nome de obra, fornecedor e usuário | Texto após trim, 1–120 caracteres; nomes iguais permitidos                     |
| Descrição do item                  | Texto após trim, 1–200 caracteres                                              |
| Unidade                            | Texto após trim, 1–16 caracteres; sugestões un, kg, m, m², h, sem enum fechado |
| Quantidade                         | Decimal positivo, até 3 casas, de 0.001 a 1000000.000                          |
| Preço unitário                     | BRL não negativo, até 2 casas, de 0.00 a 1000000.00                            |
| Itens por pedido                   | 1–100; ordem de entrada preservada                                             |
| Observações internas               | Opcional, até 2000 caracteres após trim; vazio normalizado para null           |
| Motivo de rejeição                 | Obrigatório após trim, 1–2000 caracteres                                       |
| Total por item / pedido            | Máximo 100000000.00; acima disso, rejeitar antes de persistir                  |
| Faixas por obra                    | 0–20; configuração vazia permitida, bloqueando novos pedidos                   |
| Aprovadores por faixa              | 1–10 usuários existentes, distintos e ordenados                                |
| Teto finito de faixa               | 0.00–100000000.00, até 2 casas                                                 |
| Data do pedido                     | Data civil válida YYYY-MM-DD; sem restrição adicional de passado/futuro        |
| Corpo HTTP JSON                    | Até 256 KiB; rejeitar excessos antes de processar o corpo completo             |

API aceita decimais como strings sem separador de milhar, sinal, notação exponencial ou vírgula. Formatos locais são convertidos pela UI. Precisão excessiva é erro, não arredondamento silencioso da entrada. Saídas normalizam quantidade para 3 casas e dinheiro para 2.

## Totais

1. Validar todas as entradas e referências.
2. Calcular quantidade × preço usando aritmética decimal.
3. Arredondar cada total de item para centavos com HALF_UP.
4. Somar os totais dos itens já arredondados.
5. Validar limites de item e pedido, escolher a regra e persistir atomicamente.

Exemplos: 0.333 × 10.00 = 3.33; 0.005 × 1.00 = 0.01. Dois itens de 0.005 × 1.00 totalizam 0.02, não 0.01. Item com preço zero é válido; pedido de total zero também é válido se possuir itens e regra aplicável.

O frontend pode antecipar o cálculo com a mesma política; o resultado do servidor é a autoridade. Cliente não envia totais, status ou cadeia. Campos desconhecidos são rejeitados.

## Seleção de faixa

Cada faixa possui teto inclusivo e cadeia completa. Tetos finitos são estritamente crescentes, únicos e não negativos. Uma única faixa sem teto pode existir, apenas no fim. Cada faixa possui aprovadores diferentes entre si; o mesmo usuário pode participar de faixas diferentes.

Exemplo de configuração:

| Intervalo derivado                     | Teto persistido | Cadeia        |
| -------------------------------------- | --------------- | ------------- |
| De zero até R$ 10.000,00               | 10000.00        | Amanda        |
| Acima de R$ 10.000,00 até R$ 50.000,00 | 50000.00        | Amanda → João |
| Acima de R$ 50.000,00                  | null            | João → Carla  |

Escolher a primeira faixa cujo teto seja >= total ou a faixa final sem teto. Não acumular aprovadores de outras faixas. Sem faixa, responder NO_APPLICABLE_RULE e não criar qualquer parte do pedido.

Excluir uma faixa intermediária estende o intervalo da próxima até o teto anterior remanescente. Excluir a última faixa finita sem faixa ilimitada reduz a cobertura. A UI mostra os novos intervalos antes de salvar e exige confirmação da alteração; não há efeito em pedidos existentes.

Edição ocorre em rascunho local e um único PUT substitui a configuração completa. Adicionar, editar, remover e reordenar são operações do editor antes do save. A configuração pode ser esvaziada com confirmação. Reordenar aprovadores altera a sequência; faixas permanecem ordenadas por teto, sem drag-and-drop arbitrário.

## Pedido e estados

Na criação, copiar os aprovadores ordenados para etapas próprias, guardar a versão da configuração e o teto da faixa selecionada. Pedido inicia PENDING, version=1 e currentStepPosition=1. Não existe rascunho persistido, edição de pedido enviado, reabertura ou cancelamento separado nesta entrega.

| Estado atual                 | Comando válido                          | Resultado                                             |
| ---------------------------- | --------------------------------------- | ----------------------------------------------------- |
| PENDING, etapa intermediária | APPROVE pelo aprovador atual            | Registrar decisão, avançar posição; continuar PENDING |
| PENDING, última etapa        | APPROVE pelo aprovador atual            | Registrar decisão; APPROVED; posição atual null       |
| PENDING                      | REJECT pelo aprovador atual, com motivo | Registrar decisão; REJECTED; posição atual null       |
| APPROVED ou REJECTED         | Qualquer decisão                        | ORDER_CLOSED; sem alteração                           |

Etapas derivadas: APPROVED, REJECTED, CURRENT, UPCOMING e SKIPPED. Após rejeição, etapas posteriores são SKIPPED e não recebem decisões fictícias. O histórico contém somente decisões realmente tomadas. A versão do pedido aumenta em um a cada decisão efetiva.

## Transações e concorrência

### Configuração e criação de pedidos

Todos os escritores de configuração e criadores de pedidos bloqueiam a mesma linha Project com SELECT FOR UPDATE dentro de transação curta. Depois do lock, ler rulesVersion e a configuração. O PUT compara expectedVersion e substitui faixas/aprovadores, incrementando rulesVersion. A criação usa uma versão coerente, calcula a cadeia e insere o pedido/itens/etapas antes do commit.

Requisição inválida, erro de persistência ou conflito faz rollback. Não chamar serviços externos enquanto o lock estiver adquirido. O custo é serializar essas operações por obra; obras diferentes continuam independentes. A estratégia pode evoluir com medição, preservando as invariantes.

### Decisões

POST de decisão exige expectedVersion. Na transação, ler pedido; verificar usuário atual; atualizar condicionalmente o pedido por id, versão e estado; inserir a decisão única da etapa; avançar/concluir. Se a atualização condicional não afetar uma linha, rollback e ORDER_VERSION_CONFLICT. Constraint unique(stepId) impede decisões duplicadas.

Duas aprovações, ou aprovação versus rejeição da mesma versão, produzem apenas uma decisão efetiva. O perdedor recebe conflito e atualiza a tela. Não há replay idempotente de decisão nesta versão. Ordem de validação: entrada/identidade → existência → versão → estado → aprovador; o código retornado é determinístico para o estado lido.

### Repetição de criação

POST de pedido exige Idempotency-Key UUID. Escopo: usuário solicitante + chave. Hash de payload validado e normalizado inclui versão do contrato, ordem dos itens, referências, data e textos/decimais normalizados; exclui cabeçalhos de transporte.

Na mesma transação do pedido, fazer claim da chave por INSERT ON CONFLICT DO NOTHING em tabela dedicada. Quem perde espera o commit da transação concorrente e consulta o registro confirmado em nova instrução. Mesma chave/hash retorna o corpo original da criação com 200; chave/hash diferente retorna IDEMPOTENCY_KEY_REUSED com 409. Primeiro sucesso retorna 201. Se a primeira transação falhar, seu claim é revertido e outra tentativa pode criar normalmente.

Ordem obrigatória: validar formato/identidade e normalizar payload; consultar/claim da chave e resolver replay; somente para nova criação bloquear obra, ler regras e validar referências/condições vigentes. Replay não consulta a regra atual nem depende de sua cobertura: continua válido após esvaziar a configuração. O registro de claim, inicialmente incompleto, nunca pode ser confirmado sem pedido e resposta; todo o conjunto é uma única transação.

O corpo original é preservado para replay, mesmo se o pedido já tiver decisões; header Idempotency-Replayed: true distingue a resposta e o cliente faz GET do Location para obter o estado atual. Chaves não expiram na demonstração. Após erro sem sucesso confirmado, manter chave para tentar novamente; alterações do conteúdo geram nova chave. Uma nova solicitação intencional com conteúdo igual também gera nova chave.

A tentativa de resultado desconhecido conserva corpo, chave e solicitante originais. Trocar o usuário não transforma essa tentativa em outro pedido: reconciliar com o ator original antes de liberar novo envio desse formulário. A identidade da tentativa faz parte do estado local da submissão, sem variável global no servidor.

### Leituras

GET de regras, lista de pedidos (incluindo contagem) e detalhes devem observar um snapshot consistente por resposta. Quando forem necessárias múltiplas consultas, executar transação read-only em REPEATABLE READ; uma consulta única que componha toda a resposta também atende. Não juntar versão antiga com faixas novas, ou status antigo com decisões posteriores. O snapshot não é preservado entre requisições/páginas distintas.

## Modelo inicial

| Entidade         | Campos relevantes / relações                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project          | id, name, rulesVersion (inicia 0), createdAt                                                                                                       |
| User             | id, name, createdAt                                                                                                                                |
| Supplier         | id, name, createdAt                                                                                                                                |
| ApprovalBand     | id, projectId, position, upperLimit nullable                                                                                                       |
| BandApprover     | bandId, userId, position                                                                                                                           |
| PurchaseOrder    | id, projectId, supplierId, requesterId, orderDate, notes, total, status, version, currentStepPosition, rulesVersion, selectedUpperLimit, createdAt |
| OrderItem        | id, orderId, position, description, quantity, unit, unitPrice, lineTotal                                                                           |
| OrderStep        | id, orderId, userId, approverNameSnapshot, position                                                                                                |
| Decision         | id, stepId, actorId, outcome, reason nullable, decidedAt                                                                                           |
| OrderIdempotency | requesterId, key, requestHash, contractVersion, orderId, originalResponse, createdAt                                                               |

Não depender do ID de faixa removível para explicar pedido antigo. Guardar rulesVersion, teto e cadeia própria. Nome do aprovador é copiado para manter leitura histórica; IDs mantêm vínculo. Cadastro não expõe atualização de nomes nesta versão.

Restrições: FKs sem cascata que apague histórico; unicidade de posições por cadeia/pedido; usuário único por faixa; decisão única por etapa; chave idempotente única por solicitante; tetos finitos únicos e no máximo um teto nulo por obra. CHECKs para valores e status expressáveis. Regras entre múltiplas linhas (cadeia não vazia, continuidade) são garantidas pelo serviço transacional e testes.

Tipos iniciais: quantity NUMERIC(10,3); unitPrice NUMERIC(9,2); totais e tetos NUMERIC(11,2); orderDate DATE; instantes TIMESTAMPTZ. Multiplicação ocorre com precisão suficiente antes da validação do total; não gravar resultado intermediário que ultrapasse limites.

## Cenários de aceite F00

| Cenário                                    | Resultado contratual                                  |
| ------------------------------------------ | ----------------------------------------------------- |
| Total 10000.00                             | Primeira faixa; Amanda                                |
| Total 10000.01                             | Segunda faixa; Amanda → João                          |
| Total 50000.00                             | Segunda faixa                                         |
| Total 50000.01                             | Faixa ilimitada, se existir; senão NO_APPLICABLE_RULE |
| Total zero com item válido                 | Primeira faixa disponível                             |
| Dois itens 0.005 × 1.00                    | Total 0.02                                            |
| Usuário João tenta decidir antes de Amanda | NOT_CURRENT_APPROVER; sem gravação                    |
| Rejeição com espaços no motivo             | VALIDATION_ERROR                                      |
| Regra muda depois da criação               | Pedido mantém versão/cadeia antigas                   |
| Duas decisões sobre version=1              | Um sucesso; um ORDER_VERSION_CONFLICT                 |
| Dois PUTs com mesma rulesVersion           | Um sucesso; um RULES_VERSION_CONFLICT                 |
| Mesmo pedido/chave repetido                | Um pedido; 201 inicial e 200 no replay                |
| Mesma chave e conteúdo diferente           | IDEMPOTENCY_KEY_REUSED                                |

Estes são cenários especificados; testes executáveis serão implementados nas features correspondentes.
