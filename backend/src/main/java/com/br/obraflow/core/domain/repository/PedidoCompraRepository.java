package com.br.obraflow.core.domain.repository;

import com.br.obraflow.core.domain.pedido.FiltroPedido;
import com.br.obraflow.core.domain.pedido.PedidoCompra;
import com.br.obraflow.core.domain.pedido.PedidoResumo;
import com.br.obraflow.core.domain.shared.Pagina;

import java.util.Optional;
import java.util.UUID;

/**
 * Porta de saida para os pedidos de compra.
 */
public interface PedidoCompraRepository {

    PedidoCompra salvar(PedidoCompra pedido);

    Optional<PedidoCompra> porId(UUID id);

    /**
     * Carrega o pedido com bloqueio pessimista de linha (SELECT ... FOR UPDATE).
     * Usado na decisao para serializar decisoes concorrentes sobre a mesma cadeia.
     */
    Optional<PedidoCompra> porIdParaAtualizacao(UUID id);

    Pagina<PedidoResumo> listar(FiltroPedido filtro);

    /**
     * Remove o pedido e seus filhos (itens e etapas, via cascade).
     */
    void excluir(UUID id);

    /**
     * Quantos pedidos referenciam este nivel como origem da alcada.
     * Impede a remocao de uma faixa em uso.
     */
    long contarPorNivelAlcada(UUID nivelId);
}
