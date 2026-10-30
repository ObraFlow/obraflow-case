package com.br.obraflow.core.application.service;

import com.br.obraflow.core.application.dto.command.DecisaoComando;
import com.br.obraflow.core.application.dto.command.ItemPedidoComando;
import com.br.obraflow.core.application.dto.command.PedidoComando;
import com.br.obraflow.core.application.dto.result.AlcadaListaResultado;
import com.br.obraflow.core.application.dto.result.AlcadaResultado;
import com.br.obraflow.core.application.dto.result.AprovadorResultado;
import com.br.obraflow.core.application.dto.result.AprovadorResumo;
import com.br.obraflow.core.application.dto.result.EtapaResultado;
import com.br.obraflow.core.application.dto.result.FornecedorResultado;
import com.br.obraflow.core.application.dto.result.ObraResultado;
import com.br.obraflow.core.application.dto.result.PedidoItemResultado;
import com.br.obraflow.core.application.dto.result.PedidoListaResultado;
import com.br.obraflow.core.application.dto.result.PedidoPaginaResultado;
import com.br.obraflow.core.application.dto.result.PedidoResultado;
import com.br.obraflow.core.application.port.in.PedidoUseCase;
import com.br.obraflow.core.application.port.out.NumeroPedidoPort;
import com.br.obraflow.core.domain.alcada.NivelAlcada;
import com.br.obraflow.core.domain.alcada.ServicoAlcada;
import com.br.obraflow.core.domain.exception.EntidadeNaoEncontradaException;
import com.br.obraflow.core.domain.exception.RegraDeNegocioException;
import com.br.obraflow.core.domain.fornecedor.Fornecedor;
import com.br.obraflow.core.domain.obra.Obra;
import com.br.obraflow.core.domain.pedido.Ator;
import com.br.obraflow.core.domain.pedido.EtapaAlcada;
import com.br.obraflow.core.domain.pedido.FiltroPedido;
import com.br.obraflow.core.domain.pedido.PedidoCompra;
import com.br.obraflow.core.domain.pedido.PedidoCompraItem;
import com.br.obraflow.core.domain.pedido.PedidoResumo;
import com.br.obraflow.core.domain.pedido.SituacaoEtapa;
import com.br.obraflow.core.domain.pedido.SituacaoPedido;
import com.br.obraflow.core.domain.repository.FornecedorRepository;
import com.br.obraflow.core.domain.repository.NivelAlcadaRepository;
import com.br.obraflow.core.domain.repository.ObraRepository;
import com.br.obraflow.core.domain.repository.PedidoCompraRepository;
import com.br.obraflow.core.domain.repository.UsuarioRepository;
import com.br.obraflow.core.domain.shared.Pagina;
import com.br.obraflow.core.domain.shared.Quantidade;
import com.br.obraflow.core.domain.shared.ValorMonetario;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Implementacao dos casos de uso de pedido de compra.
 * <p>
 * A fronteira transacional ({@code @Transactional}) e' declarada aqui porque a
 * atomicidade faz parte do contrato do caso de uso: pedido + itens + cadeia de
 * aprovacao sao gravados na mesma transacao, e a decisao e' serializada por
 * bloqueio pessimista da linha do pedido.
 */
@Service
public class PedidoService implements PedidoUseCase {

    private final PedidoCompraRepository pedidoRepository;
    private final NivelAlcadaRepository nivelAlcadaRepository;
    private final ObraRepository obraRepository;
    private final FornecedorRepository fornecedorRepository;
    private final UsuarioRepository usuarioRepository;
    private final ServicoAlcada servicoAlcada;
    private final NumeroPedidoPort numeroPedido;
    private final Clock clock;

    public PedidoService(PedidoCompraRepository pedidoRepository,
                         NivelAlcadaRepository nivelAlcadaRepository,
                         ObraRepository obraRepository,
                         FornecedorRepository fornecedorRepository,
                         UsuarioRepository usuarioRepository,
                         ServicoAlcada servicoAlcada,
                         NumeroPedidoPort numeroPedido,
                         Clock clock) {
        this.pedidoRepository = pedidoRepository;
        this.nivelAlcadaRepository = nivelAlcadaRepository;
        this.obraRepository = obraRepository;
        this.fornecedorRepository = fornecedorRepository;
        this.usuarioRepository = usuarioRepository;
        this.servicoAlcada = servicoAlcada;
        this.numeroPedido = numeroPedido;
        this.clock = clock;
    }

    @Override
    @Transactional
    public PedidoResultado criar(PedidoComando comando, Ator ator) {
        if (comando == null) {
            throw new RegraDeNegocioException("Os dados do pedido sao obrigatorios.");
        }
        Obra obra = obraRepository.porId(comando.obraId())
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Obra nao encontrada: " + comando.obraId()));
        Fornecedor fornecedor = fornecedorRepository.porId(comando.fornecedorId())
                .orElseThrow(() -> new EntidadeNaoEncontradaException(
                        "Fornecedor nao encontrado: " + comando.fornecedorId()));
        if (comando.dataPedido() == null) {
            throw new RegraDeNegocioException("A data do pedido e' obrigatoria.");
        }
        if (comando.itens() == null || comando.itens().isEmpty()) {
            throw new RegraDeNegocioException("O pedido deve possuir ao menos um item.");
        }

        List<PedidoCompraItem> itens = converterItens(comando.itens());
        ValorMonetario valorTotal = calcularTotal(itens);

        List<NivelAlcada> niveis = nivelAlcadaRepository.listarPorObra(obra.id());
        NivelAlcada nivelAplicavel = servicoAlcada.nivelAplicavel(niveis, valorTotal.valor(), obra.codigo());

        PedidoCompra pedido = PedidoCompra.criar(
                UUID.randomUUID(),
                numeroPedido.proximoNumero(comando.dataPedido()),
                obra.id(),
                fornecedor.id(),
                comando.dataPedido(),
                comando.observacoes(),
                ator == null ? null : ator.usuarioId(),
                nivelAplicavel,
                itens,
                clock.instant());

        PedidoCompra salvo = pedidoRepository.salvar(pedido);
        return montarDetalhe(salvo, obra, fornecedor);
    }

    @Override
    @Transactional(readOnly = true)
    public PedidoPaginaResultado listar(FiltroPedido filtro, Ator ator) {
        Pagina<PedidoResumo> pagina = pedidoRepository.listar(filtro);
        List<PedidoListaResultado> conteudo = pagina.conteudo().stream()
                .map(this::montarItemLista)
                .toList();
        return new PedidoPaginaResultado(conteudo, pagina.pagina(), pagina.tamanho(),
                pagina.totalElementos(), pagina.totalPaginas());
    }

    @Override
    @Transactional(readOnly = true)
    public PedidoResultado obter(UUID pedidoId, Ator ator) {
        PedidoCompra pedido = pedidoRepository.porId(pedidoId)
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Pedido nao encontrado: " + pedidoId));
        Obra obra = obraRepository.porId(pedido.obraId())
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Obra nao encontrada: " + pedido.obraId()));
        Fornecedor fornecedor = fornecedorRepository.porId(pedido.fornecedorId())
                .orElseThrow(() -> new EntidadeNaoEncontradaException(
                        "Fornecedor nao encontrado: " + pedido.fornecedorId()));
        return montarDetalhe(pedido, obra, fornecedor);
    }

    @Override
    @Transactional
    public PedidoResultado registrarDecisao(UUID pedidoId, DecisaoComando comando, Ator ator) {
        if (comando == null || comando.decisao() == null) {
            throw new RegraDeNegocioException("A decisao e' obrigatoria.");
        }
        PedidoCompra pedido = pedidoRepository.porIdParaAtualizacao(pedidoId)
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Pedido nao encontrado: " + pedidoId));

        pedido.registrarDecisao(ator, comando.decisao(), comando.motivo(), clock.instant());

        PedidoCompra salvo = pedidoRepository.salvar(pedido);

        Obra obra = obraRepository.porId(salvo.obraId())
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Obra nao encontrada: " + salvo.obraId()));
        Fornecedor fornecedor = fornecedorRepository.porId(salvo.fornecedorId())
                .orElseThrow(() -> new EntidadeNaoEncontradaException(
                        "Fornecedor nao encontrado: " + salvo.fornecedorId()));
        return montarDetalhe(salvo, obra, fornecedor);
    }

    @Override
    @Transactional
    public void excluir(UUID pedidoId, Ator ator) {
        PedidoCompra pedido = pedidoRepository.porId(pedidoId)
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Pedido nao encontrado: " + pedidoId));
        pedido.verificarExclusao(ator);
        pedidoRepository.excluir(pedidoId);
    }

    private List<PedidoCompraItem> converterItens(List<ItemPedidoComando> itens) {
        List<PedidoCompraItem> resultado = new ArrayList<>();
        for (ItemPedidoComando item : itens) {
            if (item.quantidade() == null) {
                throw new RegraDeNegocioException("A quantidade do item e' obrigatoria.");
            }
            if (item.precoUnitario() == null) {
                throw new RegraDeNegocioException("O preco unitario do item e' obrigatorio.");
            }
            resultado.add(new PedidoCompraItem(
                    item.descricao(),
                    Quantidade.de(item.quantidade()),
                    item.unidade(),
                    ValorMonetario.de(item.precoUnitario())));
        }
        return resultado;
    }

    private ValorMonetario calcularTotal(List<PedidoCompraItem> itens) {
        ValorMonetario total = ValorMonetario.ZERO;
        for (PedidoCompraItem item : itens) {
            total = total.mais(item.total());
        }
        return total;
    }

    private PedidoResultado montarDetalhe(PedidoCompra pedido, Obra obra, Fornecedor fornecedor) {
        List<PedidoItemResultado> itens = pedido.itens().stream()
                .map(item -> new PedidoItemResultado(
                        item.descricao(),
                        item.quantidade().valor(),
                        item.unidade(),
                        item.precoUnitario().valor(),
                        item.total().valor()))
                .toList();

        List<EtapaResultado> etapas = pedido.etapas().stream()
                .map(this::montarEtapa)
                .toList();

        NivelAlcada nivel = nivelAlcadaRepository.porId(pedido.nivelOrigemId()).orElse(null);
        EtapaAlcada etapaCorrente = pedido.etapaCorrente().orElse(null);

        AlcadaResultado alcada = new AlcadaResultado(
                pedido.nivelOrigemId(),
                nivel == null ? null : nivel.faixa().rotulo(),
                nivel == null ? null : nivel.faixa().limiteInferior(),
                nivel == null ? null : nivel.faixa().limiteSuperior(),
                pedido.etapaAtual(),
                pedido.totalEtapas(),
                etapaCorrente == null ? null : montarAprovador(etapaCorrente.usuarioId()),
                etapas);

        return new PedidoResultado(
                pedido.id(),
                pedido.numero(),
                new ObraResultado(obra.id(), obra.codigo(), obra.nome(), obra.endereco(),
                        obra.status(), obra.criadoEm()),
                new FornecedorResultado(fornecedor.id(), fornecedor.nome(), fornecedor.documento(),
                        fornecedor.email(), fornecedor.telefone(), fornecedor.ativo(), fornecedor.criadoEm()),
                pedido.dataPedido(),
                pedido.observacoes(),
                pedido.valorTotal().valor(),
                pedido.itens().size(),
                pedido.situacao(),
                pedido.etapaAtual(),
                pedido.totalEtapas(),
                itens,
                alcada,
                pedido.criadoEm());
    }

    private PedidoListaResultado montarItemLista(PedidoResumo resumo) {
        List<EtapaResultado> etapas = resumo.etapas().stream()
                .map(etapa -> new EtapaResultado(etapa.ordem(),
                        new AprovadorResumo(etapa.usuarioId(), etapa.usuarioNome()),
                        etapa.situacao(), etapa.motivo(), etapa.decididoEm()))
                .toList();

        AprovadorResumo aprovadorAtual = null;
        List<EtapaResultado> concluidas = new ArrayList<>();
        List<AprovadorResumo> proximas = new ArrayList<>();

        for (EtapaResultado etapa : etapas) {
            if (etapa.ordem() == resumo.etapaAtual() && resumo.situacao() == SituacaoPedido.PENDENTE
                    && etapa.situacao() == SituacaoEtapa.PENDENTE) {
                aprovadorAtual = etapa.aprovador();
            }
            if (etapa.situacao() != SituacaoEtapa.PENDENTE) {
                concluidas.add(etapa);
            } else if (etapa.ordem() > resumo.etapaAtual()) {
                proximas.add(etapa.aprovador());
            }
        }

        AlcadaListaResultado alcada = new AlcadaListaResultado(
                resumo.etapaAtual(), resumo.totalEtapas(), aprovadorAtual, concluidas, proximas);

        return new PedidoListaResultado(
                resumo.id(), resumo.numero(), resumo.obraCodigo(), resumo.obraNome(),
                resumo.fornecedorNome(), resumo.dataPedido(), resumo.quantidadeItens(),
                resumo.valorTotal(), resumo.situacao(), alcada, resumo.solicitanteId());
    }

    private EtapaResultado montarEtapa(EtapaAlcada etapa) {
        return new EtapaResultado(etapa.ordem(), montarAprovador(etapa.usuarioId()),
                etapa.situacao(), etapa.motivo(), etapa.decididoEm());
    }

    private AprovadorResumo montarAprovador(UUID usuarioId) {
        String nome = usuarioRepository.porId(usuarioId)
                .map(usuario -> usuario.nome())
                .orElse(null);
        return new AprovadorResumo(usuarioId, nome);
    }
}
