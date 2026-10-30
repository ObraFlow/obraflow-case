package com.br.obraflow.core.application.dto.command;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Comando de criacao de um pedido de compra, com cabecalho e N itens.
 */
public record PedidoComando(
        UUID obraId,
        UUID fornecedorId,
        LocalDate dataPedido,
        String observacoes,
        List<ItemPedidoComando> itens) {
}
