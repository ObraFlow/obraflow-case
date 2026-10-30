package com.br.obraflow.core.domain.pedido;

import java.util.UUID;

/**
 * Criterios de filtragem da listagem de pedidos.
 */
public record FiltroPedido(
        SituacaoPedido situacao,
        UUID obraId,
        UUID fornecedorId,
        UUID aprovadorId,
        String busca,
        UUID aguardandoDecisaoDe,
        int pagina,
        int tamanho) {

    public static final int TAMANHO_PADRAO = 20;
    public static final int TAMANHO_MAXIMO = 100;

    public FiltroPedido {
        pagina = Math.max(pagina, 0);
        tamanho = tamanho <= 0 ? TAMANHO_PADRAO : Math.min(tamanho, TAMANHO_MAXIMO);
        busca = busca == null || busca.isBlank() ? null : busca.trim();
    }

    public static FiltroPedido padrao() {
        return new FiltroPedido(null, null, null, null, null, null, 0, TAMANHO_PADRAO);
    }
}
