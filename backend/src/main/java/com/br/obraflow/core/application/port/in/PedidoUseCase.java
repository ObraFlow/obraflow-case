package com.br.obraflow.core.application.port.in;

import com.br.obraflow.core.application.dto.command.DecisaoComando;
import com.br.obraflow.core.application.dto.command.PedidoComando;
import com.br.obraflow.core.application.dto.result.PedidoListaResultado;
import com.br.obraflow.core.application.dto.result.PedidoPaginaResultado;
import com.br.obraflow.core.application.dto.result.PedidoResultado;
import com.br.obraflow.core.domain.pedido.Ator;
import com.br.obraflow.core.domain.pedido.FiltroPedido;

import java.util.UUID;

/**
 * Casos de uso do pedido de compra.
 */
public interface PedidoUseCase {

    PedidoResultado criar(PedidoComando comando, Ator ator);

    PedidoPaginaResultado listar(FiltroPedido filtro, Ator ator);

    PedidoResultado obter(UUID pedidoId, Ator ator);

    PedidoResultado registrarDecisao(UUID pedidoId, DecisaoComando comando, Ator ator);

    void excluir(UUID pedidoId, Ator ator);
}
