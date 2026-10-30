package com.br.obraflow.core.application.dto.command;

import com.br.obraflow.core.domain.usuario.Papel;

import java.util.Set;

/**
 * Comando de criacao de usuario.
 */
public record UsuarioComando(
        String nome,
        String email,
        String senha,
        String cargo,
        Set<Papel> papeis) {
}
