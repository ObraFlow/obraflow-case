package com.br.obraflow.core.domain.exception;

/**
 * Entrada invalida. Mapeada para HTTP 400 Bad Request.
 */
public class ArgumentoInvalidoException extends RuntimeException {

    public ArgumentoInvalidoException(String mensagem) {
        super(mensagem);
    }
}
