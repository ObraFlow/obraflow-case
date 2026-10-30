package com.br.obraflow.core.domain.exception;

/**
 * Entidade referenciada nao existe. Mapeada para HTTP 404 Not Found.
 */
public class EntidadeNaoEncontradaException extends RuntimeException {

    public EntidadeNaoEncontradaException(String mensagem) {
        super(mensagem);
    }
}
