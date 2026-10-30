package com.br.obraflow.core.application.port.in;

import com.br.obraflow.core.application.dto.command.ObraComando;
import com.br.obraflow.core.application.dto.result.ObraResultado;

import java.util.List;
import java.util.UUID;

/**
 * Casos de uso do cadastro de obras.
 */
public interface ObraUseCase {

    List<ObraResultado> listar();

    ObraResultado criar(ObraComando comando);

    ObraResultado obter(UUID obraId);
}
