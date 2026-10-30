package com.br.obraflow.core.domain.pedido;

/**
 * Decisao aplicada pelo aprovador sobre uma etapa da cadeia.
 */
public enum TipoDecisao {

    APROVADO,
    REJEITADO;

    public SituacaoEtapa situacaoResultante() {
        return this == APROVADO ? SituacaoEtapa.APROVADO : SituacaoEtapa.REJEITADO;
    }
}
