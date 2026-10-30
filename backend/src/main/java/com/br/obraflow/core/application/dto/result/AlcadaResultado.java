package com.br.obraflow.core.application.dto.result;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Visao da alcada aplicada a um pedido: faixa que originou a cadeia e as etapas.
 */
public record AlcadaResultado(
        UUID nivelOrigemId,
        String faixaRotulo,
        BigDecimal limiteInferior,
        BigDecimal limiteSuperior,
        int etapaAtual,
        int totalEtapas,
        AprovadorResumo aprovadorAtual,
        List<EtapaResultado> etapas) {

    public AlcadaResultado {
        etapas = etapas == null ? List.of() : List.copyOf(etapas);
    }
}
