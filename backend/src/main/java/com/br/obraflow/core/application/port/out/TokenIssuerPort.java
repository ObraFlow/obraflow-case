package com.br.obraflow.core.application.port.out;

import com.br.obraflow.core.domain.usuario.Usuario;

import java.time.Instant;

/**
 * Porta de saida para emissao de tokens de acesso.
 */
public interface TokenIssuerPort {

    TokenJwt emitir(Usuario usuario);

    /**
     * Token gerado e a data de expiracao.
     */
    record TokenJwt(String token, Instant expiraEm) {
    }
}
