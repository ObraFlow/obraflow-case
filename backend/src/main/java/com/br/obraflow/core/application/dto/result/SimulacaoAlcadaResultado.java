package com.br.obraflow.core.application.dto.result;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Resultado da simulacao de uma faixa de alcada para um valor informado.
 */
public record SimulacaoAlcadaResultado(
        BigDecimal valor,
        boolean aplicavel,
        UUID nivelId,
        String faixaRotulo,
        List<AprovadorResultado> cadeia) {

    public SimulacaoAlcadaResultado {
        cadeia = cadeia == null ? List.of() : List.copyOf(cadeia);
    }
}
