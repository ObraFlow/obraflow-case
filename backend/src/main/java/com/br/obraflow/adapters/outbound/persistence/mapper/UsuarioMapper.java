package com.br.obraflow.adapters.outbound.persistence.mapper;

import com.br.obraflow.adapters.outbound.persistence.entity.UsuarioEntity;
import com.br.obraflow.core.domain.usuario.Usuario;

import java.util.LinkedHashSet;

/**
 * Conversao entre a entidade de persistencia e o agregado de dominio {@link Usuario}.
 */
public final class UsuarioMapper {

    private UsuarioMapper() {
    }

    public static Usuario toDomain(UsuarioEntity entity) {
        return Usuario.reconstituir(
                entity.getId(),
                entity.getNome(),
                entity.getEmail(),
                entity.getSenhaHash(),
                entity.getCargo(),
                entity.isAtivo(),
                new LinkedHashSet<>(entity.getPapeis()),
                entity.getCriadoEm());
    }

    public static void apply(Usuario domain, UsuarioEntity entity) {
        entity.setNome(domain.nome());
        entity.setEmail(domain.email());
        entity.setSenhaHash(domain.senhaHash());
        entity.setCargo(domain.cargo());
        entity.setAtivo(domain.ativo());
        entity.setPapeis(new LinkedHashSet<>(domain.papeis()));
    }
}
