package com.br.obraflow.core.application.dto.result;

import com.br.obraflow.core.domain.usuario.Papel;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

/**
 * Resultado de leitura de um usuario. Nunca expoe o hash da senha.
 */
public record UsuarioResultado(
        UUID id,
        String nome,
        String email,
        String cargo,
        boolean ativo,
        Set<Papel> papeis,
        Instant criadoEm) {
}
