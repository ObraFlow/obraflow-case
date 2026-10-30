package com.br.obraflow.core.domain.repository;

import com.br.obraflow.core.domain.fornecedor.Fornecedor;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Porta de saida para o cadastro de fornecedores.
 */
public interface FornecedorRepository {

    Fornecedor salvar(Fornecedor fornecedor);

    Optional<Fornecedor> porId(UUID id);

    List<Fornecedor> listar();
}
