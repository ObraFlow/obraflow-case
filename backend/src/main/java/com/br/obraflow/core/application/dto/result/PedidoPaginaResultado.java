package com.br.obraflow.core.application.dto.result;

import com.br.obraflow.core.domain.pedido.SituacaoPedido;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Resultado da listagem paginada de pedidos.
 */
public record PedidoPaginaResultado(
        List<PedidoListaResultado> conteudo,
        int pagina,
        int tamanho,
        long totalElementos,
        int totalPaginas) {
}
