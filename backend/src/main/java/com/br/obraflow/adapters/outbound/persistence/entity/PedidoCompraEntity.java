package com.br.obraflow.adapters.outbound.persistence.entity;

import com.br.obraflow.core.domain.pedido.SituacaoPedido;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Entidade JPA do pedido de compra (raiz do agregado).
 * <p>
 * O {@code versao} implementa o lock otimista: duas decisoes concorrentes sobre o
 * mesmo pedido resultam em {@code OptimisticLockException} na segunda transacao.
 */
@Entity
@Table(name = "pedido_compra")
public class PedidoCompraEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "numero", nullable = false, length = 20, unique = true)
    private String numero;

    @Column(name = "obra_id", nullable = false)
    private UUID obraId;

    @Column(name = "fornecedor_id", nullable = false)
    private UUID fornecedorId;

    @Column(name = "data_pedido", nullable = false)
    private LocalDate dataPedido;

    @Column(name = "observacoes", length = 1000)
    private String observacoes;

    @Column(name = "valor_total", nullable = false, precision = 19, scale = 4)
    private BigDecimal valorTotal;

    @Enumerated(EnumType.STRING)
    @Column(name = "situacao", nullable = false, length = 20)
    private SituacaoPedido situacao;

    @Column(name = "etapa_atual", nullable = false)
    private int etapaAtual;

    @Column(name = "nivel_alcada_id")
    private UUID nivelAlcadaId;

    @Column(name = "solicitante_id")
    private UUID solicitanteId;

    @Version
    @Column(name = "versao", nullable = false)
    private long versao;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordem ASC")
    private List<PedidoCompraItemEntity> itens = new ArrayList<>();

    @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordem ASC")
    private List<EtapaAlcadaEntity> etapas = new ArrayList<>();

    @PrePersist
    void prePersist() {
        Instant agora = Instant.now();
        if (criadoEm == null) {
            criadoEm = agora;
        }
        atualizadoEm = agora;
    }

    @PreUpdate
    void preUpdate() {
        atualizadoEm = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getNumero() {
        return numero;
    }

    public void setNumero(String numero) {
        this.numero = numero;
    }

    public UUID getObraId() {
        return obraId;
    }

    public void setObraId(UUID obraId) {
        this.obraId = obraId;
    }

    public UUID getFornecedorId() {
        return fornecedorId;
    }

    public void setFornecedorId(UUID fornecedorId) {
        this.fornecedorId = fornecedorId;
    }

    public LocalDate getDataPedido() {
        return dataPedido;
    }

    public void setDataPedido(LocalDate dataPedido) {
        this.dataPedido = dataPedido;
    }

    public String getObservacoes() {
        return observacoes;
    }

    public void setObservacoes(String observacoes) {
        this.observacoes = observacoes;
    }

    public BigDecimal getValorTotal() {
        return valorTotal;
    }

    public void setValorTotal(BigDecimal valorTotal) {
        this.valorTotal = valorTotal;
    }

    public SituacaoPedido getSituacao() {
        return situacao;
    }

    public void setSituacao(SituacaoPedido situacao) {
        this.situacao = situacao;
    }

    public int getEtapaAtual() {
        return etapaAtual;
    }

    public void setEtapaAtual(int etapaAtual) {
        this.etapaAtual = etapaAtual;
    }

    public UUID getNivelAlcadaId() {
        return nivelAlcadaId;
    }

    public void setNivelAlcadaId(UUID nivelAlcadaId) {
        this.nivelAlcadaId = nivelAlcadaId;
    }

    public UUID getSolicitanteId() {
        return solicitanteId;
    }

    public void setSolicitanteId(UUID solicitanteId) {
        this.solicitanteId = solicitanteId;
    }

    public long getVersao() {
        return versao;
    }

    public void setVersao(long versao) {
        this.versao = versao;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    public void setCriadoEm(Instant criadoEm) {
        this.criadoEm = criadoEm;
    }

    public Instant getAtualizadoEm() {
        return atualizadoEm;
    }

    public void setAtualizadoEm(Instant atualizadoEm) {
        this.atualizadoEm = atualizadoEm;
    }

    public List<PedidoCompraItemEntity> getItens() {
        return itens;
    }

    public void setItens(List<PedidoCompraItemEntity> itens) {
        this.itens = itens;
    }

    public List<EtapaAlcadaEntity> getEtapas() {
        return etapas;
    }

    public void setEtapas(List<EtapaAlcadaEntity> etapas) {
        this.etapas = etapas;
    }
}
