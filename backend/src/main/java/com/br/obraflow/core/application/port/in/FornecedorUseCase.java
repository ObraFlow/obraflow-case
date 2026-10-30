package com.br.obraflow.core.application.port.in;

import com.br.obraflow.core.application.dto.command.FornecedorComando;
import com.br.obraflow.core.application.dto.result.FornecedorResultado;

import java.util.List;
import java.util.UUID;

/**
 * Casos de uso do cadastro de fornecedores.
 */
public interface FornecedorUseCase {

    List<FornecedorResultado> listar();

    FornecedorResultado criar(FornecedorComando comando);

    FornecedorResultado obter(UUID fornecedorId);
}
