package com.br.obraflow.adapters.outbound.persistence;

import com.br.obraflow.adapters.outbound.persistence.entity.UsuarioEntity;
import com.br.obraflow.adapters.outbound.persistence.mapper.UsuarioMapper;
import com.br.obraflow.adapters.outbound.persistence.repository.UsuarioJpaRepository;
import com.br.obraflow.core.domain.repository.UsuarioRepository;
import com.br.obraflow.core.domain.usuario.Usuario;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Adaptador de saida que implementa a porta {@link UsuarioRepository} sobre JPA.
 */
@Repository
public class UsuarioRepositoryAdapter implements UsuarioRepository {

    private final UsuarioJpaRepository repository;

    public UsuarioRepositoryAdapter(UsuarioJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public Usuario salvar(Usuario usuario) {
        UsuarioEntity entity = repository.findById(usuario.id()).orElseGet(UsuarioEntity::new);
        entity.setId(usuario.id());
        if (entity.getCriadoEm() == null) {
            entity.setCriadoEm(usuario.criadoEm());
        }
        UsuarioMapper.apply(usuario, entity);
        return UsuarioMapper.toDomain(repository.save(entity));
    }

    @Override
    public Optional<Usuario> porId(UUID id) {
        return repository.findById(id).map(UsuarioMapper::toDomain);
    }

    @Override
    public Optional<Usuario> porEmail(String email) {
        return repository.findByEmailIgnoreCase(email).map(UsuarioMapper::toDomain);
    }

    @Override
    public List<Usuario> listar() {
        return repository.findAllByOrderByNomeAsc().stream()
                .map(UsuarioMapper::toDomain)
                .toList();
    }

    @Override
    public boolean existePorEmail(String email) {
        return repository.existsByEmailIgnoreCase(email);
    }
}
