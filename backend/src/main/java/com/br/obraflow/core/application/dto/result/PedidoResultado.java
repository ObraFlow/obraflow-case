package com.br.obraflow.core.application.dto.result;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Resultado de leitura do detalhe de um pedido de compra.
 */
public record PedidoResultado(
        UUID id,
        String numero,
        ObraResultado obra,
        FornecedorResultado fornecedor,
        java.time.LocalDate dataPedido,
        String observacoes,
        BigDecimal valorTotal,
        int quantidadeItens,
        com.br.obraflow.core.domain.pedido.SituacaoPedido situacao,
        int etapaAtual,
        int totalEtapas,
        List<PedidoItemResultado> itens,
        AlcadaResultado alcada,
        java.time.Instant criadoEm) {

    public PedidoResultado {
        itens = itens == null ? List.of() : List.copyOf(itens);
    }
}
