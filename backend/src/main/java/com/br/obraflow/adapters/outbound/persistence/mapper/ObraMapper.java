package com.br.obraflow.adapters.outbound.persistence.mapper;

import com.br.obraflow.adapters.outbound.persistence.entity.ObraEntity;
import com.br.obraflow.core.domain.obra.Obra;

/**
 * Conversao entre a entidade de persistencia e o agregado de dominio {@link Obra}.
 */
public final class ObraMapper {

    private ObraMapper() {
    }

    public static Obra toDomain(ObraEntity entity) {
        return Obra.reconstituir(
                entity.getId(),
                entity.getCodigo(),
                entity.getNome(),
                entity.getEndereco(),
                entity.getStatus(),
                entity.getCriadoEm());
    }

    public static void apply(Obra domain, ObraEntity entity) {
        entity.setCodigo(domain.codigo());
        entity.setNome(domain.nome());
        entity.setEndereco(domain.endereco());
        entity.setStatus(domain.status());
    }
}
