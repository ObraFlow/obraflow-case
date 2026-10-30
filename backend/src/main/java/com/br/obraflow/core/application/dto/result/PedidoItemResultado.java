package com.br.obraflow.core.application.dto.result;

import java.math.BigDecimal;

/**
 * Item de um pedido, ja com o total calculado.
 */
public record PedidoItemResultado(
        String descricao,
        BigDecimal quantidade,
        String unidade,
        BigDecimal precoUnitario,
        BigDecimal total) {
}
