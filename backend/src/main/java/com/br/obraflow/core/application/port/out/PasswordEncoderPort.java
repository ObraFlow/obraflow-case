package com.br.obraflow.core.application.port.out;

/**
 * Porta de saida para a codificacao de senhas.
 */
public interface PasswordEncoderPort {

    String codificar(String senha);

    boolean corresponde(String senha, String hash);
}
