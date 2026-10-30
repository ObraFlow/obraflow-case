package com.br.obraflow.core.application.dto.result;

import java.time.Instant;
import java.util.UUID;

/**
 * Resultado de leitura de um fornecedor.
 */
public record FornecedorResultado(
        UUID id,
        String nome,
        String documento,
        String email,
        String telefone,
        boolean ativo,
        Instant criadoEm) {
}
