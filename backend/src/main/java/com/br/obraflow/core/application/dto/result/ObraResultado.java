package com.br.obraflow.core.application.dto.result;

import com.br.obraflow.core.domain.obra.StatusObra;

import java.time.Instant;
import java.util.UUID;

/**
 * Resultado de leitura de uma obra.
 */
public record ObraResultado(
        UUID id,
        String codigo,
        String nome,
        String endereco,
        StatusObra status,
        Instant criadoEm) {
}
