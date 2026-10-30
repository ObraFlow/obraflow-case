package com.br.obraflow.core.domain.usuario;

/**
 * Papel do usuario no sistema. Define o que ele pode fazer na API.
 */
public enum Papel {

    /** Pode manter obras, usuarios, fornecedores e as regras de alcada. */
    ADMIN,

    /** Pode registrar pedidos de compra. */
    COMPRADOR,

    /** Pode decidir pedidos em que esta na cadeia de aprovacao. */
    APROVADOR
}
