package com.br.obraflow.core.domain.alcada;

import java.util.UUID;

/**
 * Aprovador de um nivel de alcada, com a sua posicao na cadeia (1-based).
 */
public final class AprovadorNivel {

    private final UUID usuarioId;
    private final int ordem;

    public AprovadorNivel(UUID usuarioId, int ordem) {
        if (usuarioId == null) {
            throw new IllegalArgumentException("Aprovador deve possuir usuario.");
        }
        if (ordem < 1) {
            throw new IllegalArgumentException("A ordem do aprovador deve ser maior que zero.");
        }
        this.usuarioId = usuarioId;
        this.ordem = ordem;
    }

    public UUID usuarioId() {
        return usuarioId;
    }

    public int ordem() {
        return ordem;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (!(obj instanceof AprovadorNivel outro)) {
            return false;
        }
        return ordem == outro.ordem && usuarioId.equals(outro.usuarioId);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hash(usuarioId, ordem);
    }
}
