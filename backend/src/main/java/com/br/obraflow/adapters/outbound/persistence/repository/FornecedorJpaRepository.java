package com.br.obraflow.adapters.outbound.persistence.repository;

import com.br.obraflow.adapters.outbound.persistence.entity.FornecedorEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/**
 * Repositorio Spring Data dos fornecedores.
 */
public interface FornecedorJpaRepository extends JpaRepository<FornecedorEntity, UUID> {

    List<FornecedorEntity> findAllByOrderByNomeAsc();
}
