package com.br.obraflow.adapters.outbound.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.util.UUID;

/**
 * Entidade JPA do aprovador de um nivel de alcada.
 * O usuario e' referenciado apenas pelo id para evitar N+1 nas listagens.
 */
@Entity
@Table(name = "aprovador_nivel")
public class AprovadorNivelEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "nivel_alcada_id", nullable = false)
    private NivelAlcadaEntity nivel;

    @Column(name = "usuario_id", nullable = false)
    private UUID usuarioId;

    @Column(name = "ordem", nullable = false)
    private int ordem;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public NivelAlcadaEntity getNivel() {
        return nivel;
    }

    public void setNivel(NivelAlcadaEntity nivel) {
        this.nivel = nivel;
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
}
