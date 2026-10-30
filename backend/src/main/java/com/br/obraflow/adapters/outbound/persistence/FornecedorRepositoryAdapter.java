package com.br.obraflow.adapters.outbound.persistence;

import com.br.obraflow.adapters.outbound.persistence.entity.FornecedorEntity;
import com.br.obraflow.adapters.outbound.persistence.mapper.FornecedorMapper;
import com.br.obraflow.adapters.outbound.persistence.repository.FornecedorJpaRepository;
import com.br.obraflow.core.domain.fornecedor.Fornecedor;
import com.br.obraflow.core.domain.repository.FornecedorRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Adaptador de saida que implementa a porta {@link FornecedorRepository} sobre JPA.
 */
@Repository
public class FornecedorRepositoryAdapter implements FornecedorRepository {

    private final FornecedorJpaRepository repository;

    public FornecedorRepositoryAdapter(FornecedorJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public Fornecedor salvar(Fornecedor fornecedor) {
        FornecedorEntity entity = repository.findById(fornecedor.id()).orElseGet(FornecedorEntity::new);
        entity.setId(fornecedor.id());
        if (entity.getCriadoEm() == null) {
            entity.setCriadoEm(fornecedor.criadoEm());
        }
        FornecedorMapper.apply(fornecedor, entity);
        return FornecedorMapper.toDomain(repository.save(entity));
    }

    @Override
    public Optional<Fornecedor> porId(UUID id) {
        return repository.findById(id).map(FornecedorMapper::toDomain);
    }

    @Override
    public List<Fornecedor> listar() {
        return repository.findAllByOrderByNomeAsc().stream()
                .map(FornecedorMapper::toDomain)
                .toList();
    }
}
