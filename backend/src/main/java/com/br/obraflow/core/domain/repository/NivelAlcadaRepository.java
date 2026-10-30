package com.br.obraflow.core.domain.repository;

import com.br.obraflow.core.domain.alcada.NivelAlcada;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Porta de saida para as regras de alcada.
 */
public interface NivelAlcadaRepository {

    NivelAlcada salvar(NivelAlcada nivel);

    Optional<NivelAlcada> porId(UUID id);

    List<NivelAlcada> listarPorObra(UUID obraId);

    void remover(UUID id);
}
