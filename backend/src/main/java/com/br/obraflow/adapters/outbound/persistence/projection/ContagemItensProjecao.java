package com.br.obraflow.adapters.outbound.persistence.projection;

import java.util.UUID;

/**
 * Projecao de contagem de itens por pedido.
 */
public interface ContagemItensProjecao {

    UUID getPedidoId();

    long getTotal();
}
