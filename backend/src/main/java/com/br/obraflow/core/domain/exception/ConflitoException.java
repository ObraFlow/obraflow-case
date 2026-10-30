package com.br.obraflow.core.domain.exception;

/**
 * Conflito de estado: alteracao concorrente, regra ja existente ou pedido ja decidido.
 * Mapeada para HTTP 409 Conflict.
 */
public class ConflitoException extends RuntimeException {

    public ConflitoException(String mensagem) {
        super(mensagem);
    }

    public ConflitoException(String mensagem, Throwable causa) {
        super(mensagem, causa);
    }
}
