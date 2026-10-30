package com.br.obraflow.adapters.outbound.persistence.mapper;

import com.br.obraflow.adapters.outbound.persistence.entity.NivelAlcadaEntity;
import com.br.obraflow.core.domain.alcada.AprovadorNivel;
import com.br.obraflow.core.domain.alcada.FaixaValor;
import com.br.obraflow.core.domain.alcada.NivelAlcada;

import java.util.List;

/**
 * Conversao entre a entidade de persistencia e o agregado de dominio {@link NivelAlcada}.
 */
public final class NivelAlcadaMapper {

    private NivelAlcadaMapper() {
    }

    public static NivelAlcada toDomain(NivelAlcadaEntity entity) {
        List<AprovadorNivel> aprovadores = entity.getAprovadores().stream()
                .map(aprovador -> new AprovadorNivel(aprovador.getUsuarioId(), aprovador.getOrdem()))
                .toList();
        return NivelAlcada.reconstituir(
                entity.getId(),
                entity.getObraId(),
                FaixaValor.de(entity.getLimiteInferior(), entity.getLimiteSuperior()),
                entity.getDescricao(),
                aprovadores);
    }
}
