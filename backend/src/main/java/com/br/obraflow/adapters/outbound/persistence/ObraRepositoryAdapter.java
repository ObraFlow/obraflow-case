package com.br.obraflow.adapters.outbound.persistence;

import com.br.obraflow.adapters.outbound.persistence.entity.ObraEntity;
import com.br.obraflow.adapters.outbound.persistence.mapper.ObraMapper;
import com.br.obraflow.adapters.outbound.persistence.repository.ObraJpaRepository;
import com.br.obraflow.core.domain.obra.Obra;
import com.br.obraflow.core.domain.repository.ObraRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Adaptador de saida que implementa a porta {@link ObraRepository} sobre JPA.
 */
@Repository
public class ObraRepositoryAdapter implements ObraRepository {

    private final ObraJpaRepository repository;

    public ObraRepositoryAdapter(ObraJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public Obra salvar(Obra obra) {
        ObraEntity entity = repository.findById(obra.id()).orElseGet(ObraEntity::new);
        entity.setId(obra.id());
        if (entity.getCriadoEm() == null) {
            entity.setCriadoEm(obra.criadoEm());
        }
        ObraMapper.apply(obra, entity);
        return ObraMapper.toDomain(repository.save(entity));
    }

    @Override
    public Optional<Obra> porId(UUID id) {
        return repository.findById(id).map(ObraMapper::toDomain);
    }

    @Override
    public List<Obra> listar() {
        return repository.findAllByOrderByCodigoAsc().stream()
                .map(ObraMapper::toDomain)
                .toList();
    }

    @Override
    public boolean existePorCodigo(String codigo) {
        return repository.existsByCodigo(codigo);
    }
}
