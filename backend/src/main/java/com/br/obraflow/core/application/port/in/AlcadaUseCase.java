package com.br.obraflow.core.application.port.in;

import com.br.obraflow.core.application.dto.command.NivelAlcadaComando;
import com.br.obraflow.core.application.dto.result.NivelAlcadaResultado;
import com.br.obraflow.core.application.dto.result.SimulacaoAlcadaResultado;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Casos de uso das regras de alcada por obra.
 */
public interface AlcadaUseCase {

    List<NivelAlcadaResultado> listarNiveis(UUID obraId);

    NivelAlcadaResultado criarNivel(NivelAlcadaComando comando);

    NivelAlcadaResultado atualizarNivel(UUID nivelId, NivelAlcadaComando comando);

    void removerNivel(UUID nivelId);

    SimulacaoAlcadaResultado simular(UUID nivelId, BigDecimal valor);
}
