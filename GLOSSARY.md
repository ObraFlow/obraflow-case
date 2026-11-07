# ObraFlow — aprovações por alçada

O ObraFlow decide **quem autoriza cada pedido de compra e em qual ordem**, conforme a obra e o
valor total, e registra a trilha completa de quem decidiu o quê.

## Language

**Obra**:
Projeto de construção ao qual um pedido pertence. É o contexto que determina quais regras de
alçada se aplicam.
_Avoid_: projeto, canteiro, centro de custo

**Fornecedor**:
Organização a quem o pedido de compra é dirigido.
_Avoid_: vendor, parceiro

**Usuário**:
Pessoa que pode figurar como aprovador em uma cadeia. Não confundir com Aprovador, que é um
papel exercido num pedido específico.
_Avoid_: conta, membro, colaborador

**Pedido de compra**:
Solicitação de materiais ou serviços a um fornecedor, no contexto de uma obra, composta de um
cabeçalho e um ou mais itens. Existe como rascunho antes de existir como pedido submetido.
_Avoid_: ordem, requisição, compra, OC

**Rascunho**:
Pedido ainda não submetido: incompleto por natureza, sem cadeia, sem aprovador e sem decisão
possível. É sala de espera, não um fluxo paralelo — sua única saída é a submissão.
_Avoid_: draft, temporário, pendente

**Submissão**:
O ato de enviar um rascunho. É o instante em que o pedido é validado por inteiro, a faixa
aplicável é resolvida e a cadeia é gravada. Depois dela, cabeçalho e itens são imutáveis.
_Avoid_: envio, criação, salvar

**Item do pedido**:
Uma linha do pedido: o que se compra, quanto, em que unidade e por qual preço unitário.
_Avoid_: linha, produto, material

**Total do pedido**:
Soma dos totais de todos os itens. É o único valor que determina a alçada — nenhum item isolado
determina alçada.
_Avoid_: valor, montante, subtotal

**Papel**:
O que um usuário pode fazer no sistema, independente de pedido: `admin`, `aprovador`,
`comprador` ou `visualizador`. Responde a pergunta anterior à alçada — a alçada diz quem assina
este pedido, o papel diz quem pode o quê.
_Avoid_: permissão, perfil, role, nível de acesso

**Sessão**:
A identidade ativa no servidor, gravada em cookie httpOnly. É ela que determina papel e
aprovador da vez — nunca o que o cliente afirma ser.
_Avoid_: login, token, usuário logado

**Modo demo**:
Estado da aplicação em que a entrada dispensa senha e a troca de usuário é oferecida. Existe
apenas sob a flag que o habilita; desligada, as rotas correspondentes não respondem.
_Avoid_: ambiente de teste, sandbox, mock

## Alçada

**Alçada**:
O conjunto de regras de uma obra que define quem autoriza um pedido e em qual ordem.
_Avoid_: aprovação, workflow, permissão

**Faixa**:
Um intervalo de valor dentro da alçada de uma obra, definido pelo seu **limite superior** e
associado a uma sequência ordenada de usuários. Uma faixa sem limite superior cobre todos os
valores acima da faixa anterior.
_Avoid_: nível, regra, tier, range

**Limite superior**:
O maior total de pedido que ainda cai na faixa. É **inclusivo**: um pedido de exatamente
R$ 10.000,00 pertence à faixa "até R$ 10.000,00".
_Avoid_: teto, limite, valor máximo

**Cadeia de aprovação**:
A sequência ordenada de etapas gravada no pedido no momento da sua submissão, derivada da faixa
aplicável. É um registro histórico do pedido, não uma visão da regra atual.
_Avoid_: fluxo, workflow, alçada do pedido

**Etapa**:
Uma posição na cadeia: um usuário, sua ordem e o resultado da sua decisão, se já houver.
_Avoid_: passo, nível, aprovação

**Sessão**:
O vínculo, mantido no servidor, entre o navegador e o usuário ativo. Trocar de usuário cria uma
sessão nova — não renomeia a atual. Tudo que o usuário pode fazer é derivado dela, nunca de algo
que o cliente informe.
_Avoid_: login, token, usuário logado

**Aprovador da vez**:
O usuário da primeira etapa ainda sem decisão. É o único que pode decidir; qualquer outro é
recusado pelo servidor.
_Avoid_: aprovador atual, responsável, próximo

**Decisão**:
O ato de aprovar ou rejeitar uma etapa. Rejeição exige motivo e encerra o pedido inteiro;
aprovação avança para a etapa seguinte.
_Avoid_: ação, resposta, voto

**Sem regra aplicável**:
Estado em que o total do pedido não cai em nenhuma faixa da obra — porque a obra não tem faixas,
ou porque o total excede o limite superior da faixa mais alta. Impede a submissão, mas não impede
que o rascunho continue existindo.
_Avoid_: sem alçada, erro de regra, fora da faixa
