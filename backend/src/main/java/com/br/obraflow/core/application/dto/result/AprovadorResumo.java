package com.br.obraflow.core.application.dto.result;

import java.util.UUID;

/**
 * Aprovador resumido, usado nos retornos de pedido.
 */
public record AprovadorResumo(UUID usuarioId, String usuarioNome) {
}
