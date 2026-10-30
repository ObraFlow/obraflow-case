package com.br.obraflow.core.application.service;

import com.br.obraflow.core.application.dto.command.FornecedorComando;
import com.br.obraflow.core.application.dto.result.FornecedorResultado;
import com.br.obraflow.core.application.port.in.FornecedorUseCase;
import com.br.obraflow.core.domain.exception.EntidadeNaoEncontradaException;
import com.br.obraflow.core.domain.fornecedor.Fornecedor;
import com.br.obraflow.core.domain.repository.FornecedorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.List;
import java.util.UUID;

/**
 * Implementacao dos casos de uso do cadastro de fornecedores.
 */
@Service
public class FornecedorService implements FornecedorUseCase {

    private final FornecedorRepository fornecedorRepository;
    private final Clock clock;

    public FornecedorService(FornecedorRepository fornecedorRepository, Clock clock) {
        this.fornecedorRepository = fornecedorRepository;
        this.clock = clock;
    }

    @Override
    @Transactional(readOnly = true)
    public List<FornecedorResultado> listar() {
        return fornecedorRepository.listar().stream().map(this::montarResultado).toList();
    }

    @Override
    @Transactional
    public FornecedorResultado criar(FornecedorComando comando) {
        Fornecedor fornecedor = Fornecedor.novo(UUID.randomUUID(), comando.nome(), comando.documento(),
                comando.email(), comando.telefone(), clock.instant());
        return montarResultado(fornecedorRepository.salvar(fornecedor));
    }

    @Override
    @Transactional(readOnly = true)
    public FornecedorResultado obter(UUID fornecedorId) {
        return fornecedorRepository.porId(fornecedorId)
                .map(this::montarResultado)
                .orElseThrow(() -> new EntidadeNaoEncontradaException(
                        "Fornecedor nao encontrado: " + fornecedorId));
    }

    private FornecedorResultado montarResultado(Fornecedor fornecedor) {
        return new FornecedorResultado(fornecedor.id(), fornecedor.nome(), fornecedor.documento(),
                fornecedor.email(), fornecedor.telefone(), fornecedor.ativo(), fornecedor.criadoEm());
    }
}
