package com.br.obraflow.core.application.dto.command;

/**
 * Comando de criacao de fornecedor.
 */
public record FornecedorComando(String nome, String documento, String email, String telefone) {
}
