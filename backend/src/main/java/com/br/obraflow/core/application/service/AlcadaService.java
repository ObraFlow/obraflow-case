package com.br.obraflow.core.application.service;

import com.br.obraflow.core.application.dto.command.NivelAlcadaComando;
import com.br.obraflow.core.application.dto.result.AprovadorResultado;
import com.br.obraflow.core.application.dto.result.NivelAlcadaResultado;
import com.br.obraflow.core.application.dto.result.SimulacaoAlcadaResultado;
import com.br.obraflow.core.application.port.in.AlcadaUseCase;
import com.br.obraflow.core.domain.alcada.FaixaValor;
import com.br.obraflow.core.domain.alcada.NivelAlcada;
import com.br.obraflow.core.domain.alcada.ServicoAlcada;
import com.br.obraflow.core.domain.exception.ConflitoException;
import com.br.obraflow.core.domain.exception.EntidadeNaoEncontradaException;
import com.br.obraflow.core.domain.exception.RegraDeNegocioException;
import com.br.obraflow.core.domain.obra.Obra;
import com.br.obraflow.core.domain.repository.NivelAlcadaRepository;
import com.br.obraflow.core.domain.repository.ObraRepository;
import com.br.obraflow.core.domain.repository.PedidoCompraRepository;
import com.br.obraflow.core.domain.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Implementacao dos casos de uso das regras de alcada.
 */
@Service
public class AlcadaService implements AlcadaUseCase {

    private final NivelAlcadaRepository nivelRepository;
    private final ObraRepository obraRepository;
    private final UsuarioRepository usuarioRepository;
    private final PedidoCompraRepository pedidoRepository;
    private final ServicoAlcada servicoAlcada;

    public AlcadaService(NivelAlcadaRepository nivelRepository,
                         ObraRepository obraRepository,
                         UsuarioRepository usuarioRepository,
                         PedidoCompraRepository pedidoRepository,
                         ServicoAlcada servicoAlcada) {
        this.nivelRepository = nivelRepository;
        this.obraRepository = obraRepository;
        this.usuarioRepository = usuarioRepository;
        this.pedidoRepository = pedidoRepository;
        this.servicoAlcada = servicoAlcada;
    }

    @Override
    @Transactional(readOnly = true)
    public List<NivelAlcadaResultado> listarNiveis(UUID obraId) {
        obraRepository.porId(obraId)
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Obra nao encontrada: " + obraId));
        return nivelRepository.listarPorObra(obraId).stream()
                .map(this::montarResultado)
                .toList();
    }

    @Override
    @Transactional
    public NivelAlcadaResultado criarNivel(NivelAlcadaComando comando) {
        Obra obra = obraRepository.porId(comando.obraId())
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Obra nao encontrada: " + comando.obraId()));
        validarAprovadores(comando.usuariosAprovadores());

        FaixaValor faixa = FaixaValor.de(comando.limiteInferior(), comando.limiteSuperior());
        List<NivelAlcada> existentes = nivelRepository.listarPorObra(obra.id());
        servicoAlcada.validarNaoSobreposicao(faixa, existentes, null, obra.codigo());

        NivelAlcada nivel = NivelAlcada.novo(UUID.randomUUID(), obra.id(), faixa,
                comando.descricao(), comando.usuariosAprovadores());
        return montarResultado(nivelRepository.salvar(nivel));
    }

    @Override
    @Transactional
    public NivelAlcadaResultado atualizarNivel(UUID nivelId, NivelAlcadaComando comando) {
        NivelAlcada nivel = nivelRepository.porId(nivelId)
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Nivel de alcada nao encontrado: " + nivelId));
        Obra obra = obraRepository.porId(nivel.obraId())
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Obra nao encontrada: " + nivel.obraId()));

        validarAprovadores(comando.usuariosAprovadores());

        FaixaValor faixa = FaixaValor.de(comando.limiteInferior(), comando.limiteSuperior());
        List<NivelAlcada> existentes = nivelRepository.listarPorObra(obra.id());
        servicoAlcada.validarNaoSobreposicao(faixa, existentes, nivelId, obra.codigo());

        nivel.alterarFaixa(faixa);
        nivel.alterarDescricao(comando.descricao());
        nivel.redefinirAprovadores(comando.usuariosAprovadores());

        return montarResultado(nivelRepository.salvar(nivel));
    }

    @Override
    @Transactional
    public void removerNivel(UUID nivelId) {
        NivelAlcada nivel = nivelRepository.porId(nivelId)
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Nivel de alcada nao encontrado: " + nivelId));

        long pedidosVinculados = pedidoRepository.contarPorNivelAlcada(nivelId);
        if (pedidosVinculados > 0) {
            throw new ConflitoException(
                    "Esta faixa e' a origem da alcada de " + pedidosVinculados
                            + " pedido(s) e nao' pode ser removida. Ajuste a faixa ou crie outra.");
        }
        nivelRepository.remover(nivel.id());
    }

    @Override
    @Transactional(readOnly = true)
    public SimulacaoAlcadaResultado simular(UUID nivelId, java.math.BigDecimal valor) {
        NivelAlcada nivel = nivelRepository.porId(nivelId)
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Nivel de alcada nao encontrado: " + nivelId));
        if (valor == null) {
            throw new RegraDeNegocioException("Informe o valor a ser simulado.");
        }
        boolean aplicavel = nivel.contem(valor);
        List<AprovadorResultado> cadeia = aplicavel ? montarAprovadores(nivel) : List.of();
        return new SimulacaoAlcadaResultado(valor, aplicavel, nivel.id(),
                nivel.faixa().rotulo(), cadeia);
    }

    private void validarAprovadores(List<UUID> usuariosAprovadores) {
        if (usuariosAprovadores == null || usuariosAprovadores.isEmpty()) {
            throw new RegraDeNegocioException("A faixa deve possuir ao menos um aprovador.");
        }
        for (UUID usuarioId : usuariosAprovadores) {
            usuarioRepository.porId(usuarioId)
                    .orElseThrow(() -> new EntidadeNaoEncontradaException(
                            "Aprovador nao encontrado: " + usuarioId));
        }
    }

    private NivelAlcadaResultado montarResultado(NivelAlcada nivel) {
        return new NivelAlcadaResultado(
                nivel.id(),
                nivel.obraId(),
                nivel.faixa().limiteInferior(),
                nivel.faixa().limiteSuperior(),
                nivel.faixa().rotulo(),
                nivel.descricao(),
                montarAprovadores(nivel));
    }

    private List<AprovadorResultado> montarAprovadores(NivelAlcada nivel) {
        return nivel.aprovadores().stream()
                .map(aprovador -> new AprovadorResultado(
                        aprovador.ordem(),
                        aprovador.usuarioId(),
                        usuarioRepository.porId(aprovador.usuarioId())
                                .map(usuario -> usuario.nome())
                                .orElse(null)))
                .toList();
    }
}
