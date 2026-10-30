package com.br.obraflow.adapters.outbound.persistence.repository;

import com.br.obraflow.adapters.outbound.persistence.entity.ObraEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/**
 * Repositorio Spring Data das obras.
 */
public interface ObraJpaRepository extends JpaRepository<ObraEntity, UUID> {

    boolean existsByCodigo(String codigo);

    List<ObraEntity> findAllByOrderByCodigoAsc();
}
