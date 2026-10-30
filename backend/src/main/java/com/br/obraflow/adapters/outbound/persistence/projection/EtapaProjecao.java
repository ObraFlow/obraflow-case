package com.br.obraflow.adapters.outbound.persistence.projection;

import com.br.obraflow.core.domain.pedido.SituacaoEtapa;

import java.time.Instant;
import java.util.UUID;

/**
 * Projecao de leitura das etapas de alcada (join com o nome do aprovador).
 */
public interface EtapaProjecao {

    UUID getPedidoId();

    int getOrdem();

    UUID getUsuarioId();

    String getUsuarioNome();

    SituacaoEtapa getSituacao();

    String getMotivo();

    Instant getDecididoEm();
}
