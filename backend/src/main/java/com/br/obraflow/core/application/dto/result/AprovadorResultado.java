package com.br.obraflow.core.application.dto.result;

import java.util.UUID;

/**
 * Aprovador de um nivel, na ordem do fluxo.
 */
public record AprovadorResultado(int ordem, UUID usuarioId, String usuarioNome) {
}
