package com.br.obraflow.core.domain.repository;

import com.br.obraflow.core.domain.obra.Obra;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Porta de saida para o cadastro de obras.
 */
public interface ObraRepository {

    Obra salvar(Obra obra);

    Optional<Obra> porId(UUID id);

    List<Obra> listar();

    boolean existePorCodigo(String codigo);
}
