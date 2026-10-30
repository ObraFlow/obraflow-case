package com.br.obraflow.core.domain.repository;

import com.br.obraflow.core.domain.usuario.Usuario;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Porta de saida para o cadastro de usuarios.
 */
public interface UsuarioRepository {

    Usuario salvar(Usuario usuario);

    Optional<Usuario> porId(UUID id);

    Optional<Usuario> porEmail(String email);

    List<Usuario> listar();

    boolean existePorEmail(String email);
}
