package com.br.obraflow.core.application.dto.result;

import java.util.List;

/**
 * Resumo da alcada de um pedido na listagem: quem ja decidiu, quem decide agora
 * e quem vem a seguir.
 */
public record AlcadaListaResultado(
        int etapaAtual,
        int totalEtapas,
        AprovadorResumo aprovadorAtual,
        List<EtapaResultado> etapasConcluidas,
        List<AprovadorResumo> proximasEtapas) {

    public AlcadaListaResultado {
        etapasConcluidas = etapasConcluidas == null ? List.of() : List.copyOf(etapasConcluidas);
        proximasEtapas = proximasEtapas == null ? List.of() : List.copyOf(proximasEtapas);
    }
}
