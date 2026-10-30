package com.br.obraflow.core.application.dto.result;

import com.br.obraflow.core.domain.pedido.SituacaoPedido;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Item da listagem de pedidos, com o resumo da alcada atual.
 */
public record PedidoListaResultado(
        UUID id,
        String numero,
        String obraCodigo,
        String obraNome,
        String fornecedorNome,
        LocalDate dataPedido,
        int quantidadeItens,
        BigDecimal valorTotal,
        SituacaoPedido situacao,
        AlcadaListaResultado alcada,
        UUID solicitanteId) {
}
