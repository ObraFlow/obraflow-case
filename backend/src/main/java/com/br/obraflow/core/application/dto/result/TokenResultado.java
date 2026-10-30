package com.br.obraflow.core.application.dto.result;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Resultado da autenticacao: token de acesso e perfil do usuario.
 */
public record TokenResultado(
        String accessToken,
        String tokenType,
        long expiresInSeconds,
        Instant expiraEm,
        UsuarioResultado usuario) {
}
