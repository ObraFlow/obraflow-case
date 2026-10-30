package com.br.obraflow.core.application.port.in;

import com.br.obraflow.core.application.dto.result.TokenResultado;

/**
 * Caso de uso de autenticacao.
 */
public interface AutenticacaoUseCase {

    TokenResultado autenticar(String email, String senha);
}
