package com.br.obraflow.core.domain.pedido;

import com.br.obraflow.core.domain.alcada.NivelAlcada;
import com.br.obraflow.core.domain.exception.ArgumentoInvalidoException;
import com.br.obraflow.core.domain.exception.RegraDeNegocioException;
import com.br.obraflow.core.domain.shared.ValorMonetario;
import com.br.obraflow.core.domain.usuario.Papel;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * Aggregate root do pedido de compra.
 * <p>
 * Responsabilidades:
 * <ul>
 *     <li>calcular e congelar o total a partir dos itens;</li>
 *     <li>receber, no ato da criacao, o nivel de alcada aplicavel e materializar o
 *         <b>snapshot</b> da cadeia de aprovadores;</li>
 *     <li>garantir que as decisoes sigam a ordem da cadeia, que a rejeicao exija
 *         motivo e que o fluxo seja interrompido em caso de rejeicao.</li>
 * </ul>
 */
public class PedidoCompra {

    private final UUID id;
    private final String numero;
    private final UUID obraId;
    private final UUID fornecedorId;
    private final LocalDate dataPedido;
    private final String observacoes;
    private final UUID solicitanteId;
    private final UUID nivelOrigemId;
    private final List<PedidoCompraItem> itens;
    private final List<EtapaAlcada> etapas;
    private final ValorMonetario valorTotal;
    private final Instant criadoEm;

    private SituacaoPedido situacao;
    private int etapaAtual;

    private PedidoCompra(UUID id, String numero, UUID obraId, UUID fornecedorId, LocalDate dataPedido,
                         String observacoes, UUID solicitanteId, UUID nivelOrigemId,
                         List<PedidoCompraItem> itens, List<EtapaAlcada> etapas, ValorMonetario valorTotal,
                         SituacaoPedido situacao, int etapaAtual, Instant criadoEm) {
        this.id = Objects.requireNonNull(id, "id do pedido e' obrigatorio");
        this.numero = Objects.requireNonNull(numero, "numero do pedido e' obrigatorio");
        this.obraId = Objects.requireNonNull(obraId, "obra do pedido e' obrigatoria");
        this.fornecedorId = Objects.requireNonNull(fornecedorId, "fornecedor do pedido e' obrigatorio");
        this.dataPedido = Objects.requireNonNull(dataPedido, "data do pedido e' obrigatoria");
        this.observacoes = observacoes == null || observacoes.isBlank() ? null : observacoes.trim();
        this.solicitanteId = solicitanteId;
        this.nivelOrigemId = Objects.requireNonNull(nivelOrigemId, "nivel de alcada de origem e' obrigatorio");
        this.itens = new ArrayList<>(itens);
        this.criadoEm = Objects.requireNonNull(criadoEm, "instante de criacao e' obrigatorio");

        this.etapas = new ArrayList<>(etapas);
        this.valorTotal = valorTotal;
        this.situacao = situacao;
        this.etapaAtual = etapaAtual;
    }

    public static PedidoCompra criar(UUID id, String numero, UUID obraId, UUID fornecedorId,
                                     LocalDate dataPedido, String observacoes, UUID solicitanteId,
                                     NivelAlcada nivelAplicavel, List<PedidoCompraItem> itens,
                                     Instant criadoEm) {
        if (itens == null || itens.isEmpty()) {
            throw new ArgumentoInvalidoException("O pedido deve possuir ao menos um item.");
        }
        if (nivelAplicavel == null) {
            throw new ArgumentoInvalidoException("O nivel de alcada aplicavel e' obrigatorio.");
        }
        return new PedidoCompra(id, numero, obraId, fornecedorId, dataPedido, observacoes, solicitanteId,
                nivelAplicavel.id(), itens, montarEtapas(nivelAplicavel), calcularTotal(itens),
                SituacaoPedido.PENDENTE, 1, criadoEm);
    }

    /**
     * Reconstitui um pedido ja' persistido (uso dos adaptadores de saida), preservando
     * a situacao e a etapa corrente da cadeia.
     */
    public static PedidoCompra reconstituir(UUID id, String numero, UUID obraId, UUID fornecedorId,
                                             LocalDate dataPedido, String observacoes, UUID solicitanteId,
                                             UUID nivelOrigemId, List<PedidoCompraItem> itens,
                                             List<EtapaAlcada> etapas, SituacaoPedido situacao,
                                             int etapaAtual, Instant criadoEm) {
        return new PedidoCompra(id, numero, obraId, fornecedorId, dataPedido, observacoes, solicitanteId,
                nivelOrigemId, itens, etapas, calcularTotal(itens), situacao, etapaAtual, criadoEm);
    }

    /**
     * Registra a decisao do aprovador sobre a etapa corrente.
     *
     * @throws RegraDeNegocioException se a cadeia ja' tiver concluido, se o ator nao for o
     *                                  aprovador da etapa corrente (decisao fora da ordem) ou
     *                                  se a rejeicao vier sem motivo.
     */
    public void registrarDecisao(Ator ator, TipoDecisao decisao, String motivo, Instant agora) {
        if (situacao != SituacaoPedido.PENDENTE) {
            throw new RegraDeNegocioException(
                    "A cadeia de aprovacao do pedido " + numero + " ja' foi concluida ("
                            + situacao + ") e nao' aceita novas decisoes.");
        }
        if (etapaAtual < 1 || etapaAtual > etapas.size()) {
            throw new IllegalStateException("etapaAtual invalida: " + etapaAtual + " (total: " + etapas.size() + ")");
        }

        EtapaAlcada etapa = etapas.get(etapaAtual - 1);
        if (!etapa.usuarioId().equals(ator.usuarioId())) {
            throw new RegraDeNegocioException(
                    "Decisao fora da ordem da alcada. A proxima decisao do pedido " + numero
                            + " pertence a etapa " + etapa.ordem() + ".");
        }

        etapa.registrarDecisao(decisao, motivo, agora);

        if (decisao == TipoDecisao.REJEITADO) {
            this.situacao = SituacaoPedido.REJEITADO;
        } else if (etapaAtual == etapas.size()) {
            this.situacao = SituacaoPedido.APROVADO;
        } else {
            this.etapaAtual++;
        }
    }

    /** Etapa que aguarda decisao, vazia quando a cadeia ja' foi concluida. */
    public Optional<EtapaAlcada> etapaCorrente() {
        if (situacao != SituacaoPedido.PENDENTE) {
            return Optional.empty();
        }
        return Optional.of(etapas.get(etapaAtual - 1));
    }

    public boolean podeSerDecididoPor(UUID usuarioId) {
        return etapaCorrente().map(etapa -> etapa.usuarioId().equals(usuarioId)).orElse(false);
    }

    /**
     * Garante que o pedido possa ser excluido: apenas pedidos pendentes (ainda sem
     * decisao definitiva) ou rejeitados, e apenas pelo proprio solicitante ou por um ADMIN.
     *
     * @throws com.br.obraflow.core.domain.exception.RegraDeNegocioException quando a regra e' violada
     */
    public void verificarExclusao(Ator ator) {
        if (situacao != SituacaoPedido.PENDENTE && situacao != SituacaoPedido.REJEITADO) {
            throw new RegraDeNegocioException(
                    "Apenas pedidos pendentes ou rejeitados podem ser excluidos.");
        }
        boolean eSolicitante = solicitanteId != null && solicitanteId.equals(ator.usuarioId());
        if (!eSolicitante && !ator.possuiPapel(Papel.ADMIN)) {
            throw new RegraDeNegocioException(
                    "Apenas o solicitante do pedido ou um administrador pode exclui-lo.");
        }
    }

    private static List<EtapaAlcada> montarEtapas(NivelAlcada nivel) {
        List<EtapaAlcada> etapas = new ArrayList<>();
        int ordem = 1;
        for (var aprovador : nivel.aprovadores()) {
            etapas.add(EtapaAlcada.pendente(UUID.randomUUID(), aprovador.usuarioId(), ordem++));
        }
        return etapas;
    }

    private static ValorMonetario calcularTotal(List<PedidoCompraItem> itens) {
        ValorMonetario total = ValorMonetario.ZERO;
        for (PedidoCompraItem item : itens) {
            total = total.mais(item.total());
        }
        return total;
    }

    public UUID id() {
        return id;
    }

    public String numero() {
        return numero;
    }

    public UUID obraId() {
        return obraId;
    }

    public UUID fornecedorId() {
        return fornecedorId;
    }

    public LocalDate dataPedido() {
        return dataPedido;
    }

    public String observacoes() {
        return observacoes;
    }

    public UUID solicitanteId() {
        return solicitanteId;
    }

    public UUID nivelOrigemId() {
        return nivelOrigemId;
    }

    public List<PedidoCompraItem> itens() {
        return List.copyOf(itens);
    }

    public List<EtapaAlcada> etapas() {
        return List.copyOf(etapas);
    }

    public ValorMonetario valorTotal() {
        return valorTotal;
    }

    public SituacaoPedido situacao() {
        return situacao;
    }

    public int etapaAtual() {
        return etapaAtual;
    }

    public int totalEtapas() {
        return etapas.size();
    }

    public Instant criadoEm() {
        return criadoEm;
    }
}
