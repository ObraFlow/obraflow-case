package com.br.obraflow.core.application.dto.command;

import java.util.List;
import java.util.UUID;

/**
 * Comando de criacao/edicao de um nivel de alcada.
 * <p>
 * A ordem de {@code usuariosAprovadores} e' a ordem do fluxo de aprovacao.
 */
public record NivelAlcadaComando(
        UUID obraId,
        java.math.BigDecimal limiteInferior,
        java.math.BigDecimal limiteSuperior,
        String descricao,
        List<UUID> usuariosAprovadores) {
}
