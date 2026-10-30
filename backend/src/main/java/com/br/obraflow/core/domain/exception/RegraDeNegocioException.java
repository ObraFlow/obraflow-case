package com.br.obraflow.core.domain.exception;

/**
 * Violacao de regra de negocio detectada no nucleo de dominio.
 * Mapeada para HTTP 422 Unprocessable Entity.
 */
public class RegraDeNegocioException extends RuntimeException {

    public RegraDeNegocioException(String mensagem) {
        super(mensagem);
    }

    public RegraDeNegocioException(String mensagem, Throwable causa) {
        super(mensagem, causa);
    }
}
