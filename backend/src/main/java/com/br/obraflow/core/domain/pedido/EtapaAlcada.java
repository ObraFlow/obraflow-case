package com.br.obraflow.core.domain.pedido;

import com.br.obraflow.core.domain.exception.RegraDeNegocioException;

import java.time.Instant;
import java.util.UUID;

/**
 * Etapa da cadeia de aprovacao de um pedido.
 * <p>
 * E' o <b>snapshot</b> da regra de alcada aplicada no momento da criacao do pedido:
 * editar a regra depois nao altera a cadeia de pedidos em andamento. A etapa tambem
 * guarda a decisao tomada (situacao, motivo e instante), compondo o historico.
 */
public final class EtapaAlcada {

    private final UUID id;
    private final UUID usuarioId;
    private final int ordem;
    private SituacaoEtapa situacao;
    private String motivo;
    private Instant decididoEm;

    private EtapaAlcada(UUID id, UUID usuarioId, int ordem) {
        this.id = id;
        this.usuarioId = usuarioId;
        this.ordem = ordem;
        this.situacao = SituacaoEtapa.PENDENTE;
    }

    public static EtapaAlcada pendente(UUID id, UUID usuarioId, int ordem) {
        return new EtapaAlcada(id, usuarioId, ordem);
    }

    /**
     * Registra a decisao do aprovador. O motivo e' obrigatorio em caso de rejeicao.
     */
    public void registrarDecisao(TipoDecisao decisao, String motivo, Instant agora) {
        if (situacao != SituacaoEtapa.PENDENTE) {
            throw new RegraDeNegocioException(
                    "A etapa " + ordem + " ja' foi decidida (" + situacao + ") e nao' aceita nova decisao.");
        }
        if (decisao == TipoDecisao.REJEITADO && (motivo == null || motivo.isBlank())) {
            throw new RegraDeNegocioException("O motivo da rejeicao e' obrigatorio.");
        }
        this.situacao = decisao.situacaoResultante();
        this.motivo = decisao == TipoDecisao.REJEITADO ? motivo.trim() : null;
        this.decididoEm = agora;
    }

    public UUID id() {
        return id;
    }

    public UUID usuarioId() {
        return usuarioId;
    }

    public int ordem() {
        return ordem;
    }

    public SituacaoEtapa situacao() {
        return situacao;
    }

    public String motivo() {
        return motivo;
    }

    public Instant decididoEm() {
        return decididoEm;
    }

    public boolean pendente() {
        return situacao == SituacaoEtapa.PENDENTE;
    }
}
