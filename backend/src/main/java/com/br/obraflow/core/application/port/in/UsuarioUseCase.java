package com.br.obraflow.core.application.port.in;

import com.br.obraflow.core.application.dto.command.UsuarioComando;
import com.br.obraflow.core.application.dto.result.UsuarioResultado;

import java.util.List;
import java.util.UUID;

/**
 * Casos de uso do cadastro de usuarios.
 */
public interface UsuarioUseCase {

    List<UsuarioResultado> listar();

    UsuarioResultado criar(UsuarioComando comando);

    UsuarioResultado obter(UUID usuarioId);
}
