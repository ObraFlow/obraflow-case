# Modelagem do banco - ObraFlow

## Obra
As obras da construtora.
- idObra
- nome

## Usuario
Quem usa o sistema. Também são os aprovadores.
- idUsuario
- nome
- email

## Fornecedor
De quem a construtora compra.
- idFornecedor
- nome
- cnpj

## Pedido
O pedido de compra. Liga uma obra a um fornecedor.
- idPedido
- idObra          (FK Obra)
- idFornecedor    (FK Fornecedor)
- dataPedido
- observacoes     (não obrigatório)
- total           (soma dos itens, quem calcula é o back)
- status          (PENDENTE, APROVADO ou REJEITADO)
- etapaAtual      (em qual aprovador o pedido está parado agora)

## ItemPedido
Os itens de cada pedido.
- idItemPedido
- idPedido        (FK Pedido)
- descricao
- quantidade
- unidade         (un, kg, m, m², h)
- precoUnitario
- total           (quantidade x preço)

## Regra
As faixas de valor de cada obra. A faixa define quem aprova o pedido.
- idRegra
- idObra          (FK Obra)
- valorMaximo     (teto da faixa. null = sem teto)

## RegraAprovador
Quem aprova em cada faixa.
- idRegraAprovador
- idRegra         (FK Regra)
- idUsuario       (FK Usuario)
- ordem           (quem aprova primeiro, segundo...)

## EtapaAprovacao
Fila de aprovação de cada pedido. Faço uma copia regra quando o pedido é criado,
assim se a regra/faixa mudar depois o pedido não é afetado. Serve de histórico também.
- idEtapaAprovacao
- idPedido        (FK Pedido)
- idUsuario       (FK Usuario)
- ordem
- status          (AGUARDANDO, APROVADO ou REJEITADO)
- motivo          (só preenche quando rejeita, e aí é obrigatório)
- decididoEm      (quando a pessoa aprovou ou rejeitou)

# Como funciona
- O valor total do pedido escolhe a faixa: a menor faixa em que ele cabe.
- Se nenhuma faixa servir, o pedido não é criado e aparece uma mensagem.
- Os aprovadores aprovam um de cada vez, na ordem.
- Se alguém rejeitar, o pedido é cancelado na hora e o motivo fica salvo.
- Quando todos aprovam, o pedido fica APROVADO.