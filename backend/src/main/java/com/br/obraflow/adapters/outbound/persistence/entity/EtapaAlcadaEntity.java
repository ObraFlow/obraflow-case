package com.br.obraflow.adapters.outbound.persistence.entity;

import com.br.obraflow.core.domain.pedido.SituacaoEtapa;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA da etapa da cadeia de aprovacao (snapshot + historico de decisao).
 */
@Entity
@Table(name = "etapa_alcada")
public class EtapaAlcadaEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pedido_id", nullable = false)
    private PedidoCompraEntity pedido;

    @Column(name = "usuario_id", nullable = false)
    private UUID usuarioId;

    @Column(name = "ordem", nullable = false)
    private int ordem;

    @Enumerated(EnumType.STRING)
    @Column(name = "situacao", nullable = false, length = 20)
    private SituacaoEtapa situacao;

    @Column(name = "motivo", length = 500)
    private String motivo;

    @Column(name = "decidido_em")
    private Instant decididoEm;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public PedidoCompraEntity getPedido() {
        return pedido;
    }

    public void setPedido(PedidoCompraEntity pedido) {
        this.pedido = pedido;
    }

    public UUID getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(UUID usuarioId) {
        this.usuarioId = usuarioId;
    }

    public int getOrdem() {
        return ordem;
    }

    public void setOrdem(int ordem) {
        this.ordem = ordem;
    }

    public SituacaoEtapa getSituacao() {
        return situacao;
    }

    public void setSituacao(SituacaoEtapa situacao) {
        this.situacao = situacao;
    }

    public String getMotivo() {
        return motivo;
    }

    public void setMotivo(String motivo) {
        this.motivo = motivo;
    }

    public Instant getDecididoEm() {
        return decididoEm;
    }

    public void setDecididoEm(Instant decididoEm) {
        this.decididoEm = decididoEm;
    }
}
