package com.br.obraflow.core.application.dto.command;

import java.math.BigDecimal;

/**
 * Item de um pedido. O total nao e' informado - ele e' calculado pelo dominio.
 */
public record ItemPedidoComando(
        String descricao,
        BigDecimal quantidade,
        String unidade,
        BigDecimal precoUnitario) {
}
