package com.br.obraflow.core.application.dto.result;

import com.br.obraflow.core.domain.pedido.SituacaoEtapa;

import java.time.Instant;

/**
 * Etapa da cadeia de aprovacao com a sua decisao (historico).
 */
public record EtapaResultado(
        int ordem,
        AprovadorResumo aprovador,
        SituacaoEtapa situacao,
        String motivo,
        Instant decididoEm) {
}
