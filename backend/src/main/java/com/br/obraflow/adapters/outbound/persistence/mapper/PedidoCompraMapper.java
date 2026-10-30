package com.br.obraflow.adapters.outbound.persistence.mapper;

import com.br.obraflow.adapters.outbound.persistence.entity.EtapaAlcadaEntity;
import com.br.obraflow.adapters.outbound.persistence.entity.PedidoCompraEntity;
import com.br.obraflow.adapters.outbound.persistence.entity.PedidoCompraItemEntity;
import com.br.obraflow.core.domain.pedido.EtapaAlcada;
import com.br.obraflow.core.domain.pedido.PedidoCompra;
import com.br.obraflow.core.domain.pedido.PedidoCompraItem;
import com.br.obraflow.core.domain.pedido.SituacaoEtapa;
import com.br.obraflow.core.domain.pedido.TipoDecisao;
import com.br.obraflow.core.domain.shared.Quantidade;
import com.br.obraflow.core.domain.shared.ValorMonetario;

import java.util.List;

/**
 * Conversao entre a entidade de persistencia e o agregado de dominio {@link PedidoCompra}.
 */
public final class PedidoCompraMapper {

    private PedidoCompraMapper() {
    }

    public static PedidoCompra toDomain(PedidoCompraEntity entity) {
        List<PedidoCompraItem> itens = entity.getItens().stream()
                .map(PedidoCompraMapper::toDomain)
                .toList();
        List<EtapaAlcada> etapas = entity.getEtapas().stream()
                .map(PedidoCompraMapper::toDomain)
                .toList();

        return PedidoCompra.reconstituir(
                entity.getId(),
                entity.getNumero(),
                entity.getObraId(),
                entity.getFornecedorId(),
                entity.getDataPedido(),
                entity.getObservacoes(),
                entity.getSolicitanteId(),
                entity.getNivelAlcadaId(),
                itens,
                etapas,
                entity.getSituacao(),
                entity.getEtapaAtual(),
                entity.getCriadoEm());
    }

    public static PedidoCompraItem toDomain(PedidoCompraItemEntity entity) {
        return new PedidoCompraItem(
                entity.getDescricao(),
                Quantidade.de(entity.getQuantidade()),
                entity.getUnidade(),
                ValorMonetario.de(entity.getPrecoUnitario()));
    }

    public static EtapaAlcada toDomain(EtapaAlcadaEntity entity) {
        EtapaAlcada etapa = EtapaAlcada.pendente(entity.getId(), entity.getUsuarioId(), entity.getOrdem());
        if (entity.getSituacao() != null && entity.getSituacao() != SituacaoEtapa.PENDENTE) {
            TipoDecisao decisao = entity.getSituacao() == SituacaoEtapa.APROVADO
                    ? TipoDecisao.APROVADO
                    : TipoDecisao.REJEITADO;
            etapa.registrarDecisao(decisao, entity.getMotivo(), entity.getDecididoEm());
        }
        return etapa;
    }
}
