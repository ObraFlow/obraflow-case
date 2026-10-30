package com.br.obraflow.core.application.service;

import com.br.obraflow.core.application.dto.command.ObraComando;
import com.br.obraflow.core.application.dto.result.ObraResultado;
import com.br.obraflow.core.application.port.in.ObraUseCase;
import com.br.obraflow.core.domain.exception.ConflitoException;
import com.br.obraflow.core.domain.exception.EntidadeNaoEncontradaException;
import com.br.obraflow.core.domain.obra.Obra;
import com.br.obraflow.core.domain.repository.ObraRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.List;
import java.util.UUID;

/**
 * Implementacao dos casos de uso do cadastro de obras.
 */
@Service
public class ObraService implements ObraUseCase {

    private final ObraRepository obraRepository;
    private final Clock clock;

    public ObraService(ObraRepository obraRepository, Clock clock) {
        this.obraRepository = obraRepository;
        this.clock = clock;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ObraResultado> listar() {
        return obraRepository.listar().stream().map(this::montarResultado).toList();
    }

    @Override
    @Transactional
    public ObraResultado criar(ObraComando comando) {
        if (obraRepository.existePorCodigo(comando.codigo())) {
            throw new ConflitoException("Ja' existe uma obra com o codigo " + comando.codigo() + ".");
        }
        Obra obra = Obra.nova(UUID.randomUUID(), comando.codigo(), comando.nome(),
                comando.endereco(), clock.instant());
        return montarResultado(obraRepository.salvar(obra));
    }

    @Override
    @Transactional(readOnly = true)
    public ObraResultado obter(UUID obraId) {
        return obraRepository.porId(obraId)
                .map(this::montarResultado)
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Obra nao encontrada: " + obraId));
    }

    private ObraResultado montarResultado(Obra obra) {
        return new ObraResultado(obra.id(), obra.codigo(), obra.nome(), obra.endereco(),
                obra.status(), obra.criadoEm());
    }
}
