package com.br.obraflow.adapters.outbound.persistence.repository;

import com.br.obraflow.adapters.outbound.persistence.entity.NivelAlcadaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repositorio Spring Data dos niveis de alcada.
 */
public interface NivelAlcadaJpaRepository extends JpaRepository<NivelAlcadaEntity, UUID> {

    @Query("""
            select n from NivelAlcadaEntity n
            left join fetch n.aprovadores
            where n.obraId = :obraId
            order by n.limiteInferior asc
            """)
    List<NivelAlcadaEntity> listarPorObra(@Param("obraId") UUID obraId);

    @Query("""
            select n from NivelAlcadaEntity n
            left join fetch n.aprovadores
            where n.id = :id
            """)
    Optional<NivelAlcadaEntity> porIdComAprovadores(@Param("id") UUID id);
}
