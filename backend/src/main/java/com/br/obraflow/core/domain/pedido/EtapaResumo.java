package com.br.obraflow.core.domain.pedido;

import java.time.Instant;
import java.util.UUID;

/**
 * Resumo de uma etapa da cadeia dentro da projecao de leitura.
 */
public record EtapaResumo(
        int ordem,
        UUID usuarioId,
        String usuarioNome,
        SituacaoEtapa situacao,
        String motivo,
        Instant decididoEm) {
}
