package com.br.obraflow.core.application.dto.result;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Resultado de leitura de um nivel de alcada (faixa + cadeia de aprovadores).
 */
public record NivelAlcadaResultado(
        UUID id,
        UUID obraId,
        BigDecimal limiteInferior,
        BigDecimal limiteSuperior,
        String rotulo,
        String descricao,
        List<AprovadorResultado> aprovadores) {

    public NivelAlcadaResultado {
        aprovadores = aprovadores == null ? List.of() : List.copyOf(aprovadores);
    }
}
