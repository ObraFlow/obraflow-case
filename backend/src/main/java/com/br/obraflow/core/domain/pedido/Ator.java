package com.br.obraflow.core.domain.pedido;

import com.br.obraflow.core.domain.usuario.Papel;

import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Quem esta executando a acao. Construido a partir do token JWT na camada HTTP
 * e repassado aos casos de uso - o nucleo de dominio nao conhece Spring Security.
 */
public record Ator(UUID usuarioId, String nome, Set<Papel> papeis) {

    public Ator {
        Objects.requireNonNull(usuarioId, "usuarioId do ator e' obrigatorio");
        papeis = papeis == null ? Set.of() : Set.copyOf(papeis);
    }

    public static Ator de(UUID usuarioId, String nome, Set<Papel> papeis) {
        return new Ator(usuarioId, nome, papeis);
    }

    public boolean possuiPapel(Papel papel) {
        return papeis.contains(papel);
    }
}
