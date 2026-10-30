package com.br.obraflow.adapters.outbound.persistence;

import com.br.obraflow.adapters.outbound.persistence.entity.EtapaAlcadaEntity;
import com.br.obraflow.adapters.outbound.persistence.entity.PedidoCompraEntity;
import com.br.obraflow.adapters.outbound.persistence.entity.PedidoCompraItemEntity;
import com.br.obraflow.adapters.outbound.persistence.mapper.PedidoCompraMapper;
import com.br.obraflow.adapters.outbound.persistence.projection.ContagemItensProjecao;
import com.br.obraflow.adapters.outbound.persistence.projection.EtapaProjecao;
import com.br.obraflow.adapters.outbound.persistence.repository.FornecedorJpaRepository;
import com.br.obraflow.adapters.outbound.persistence.repository.ObraJpaRepository;
import com.br.obraflow.adapters.outbound.persistence.repository.PedidoCompraJpaRepository;
import com.br.obraflow.core.domain.pedido.EtapaAlcada;
import com.br.obraflow.core.domain.pedido.EtapaResumo;
import com.br.obraflow.core.domain.pedido.FiltroPedido;
import com.br.obraflow.core.domain.pedido.PedidoCompra;
import com.br.obraflow.core.domain.pedido.PedidoCompraItem;
import com.br.obraflow.core.domain.pedido.PedidoResumo;
import com.br.obraflow.core.domain.repository.PedidoCompraRepository;
import com.br.obraflow.core.domain.shared.Pagina;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Adaptador de saida que implementa a porta {@link PedidoCompraRepository} sobre JPA.
 */
@Repository
public class PedidoCompraRepositoryAdapter implements PedidoCompraRepository {

    private final PedidoCompraJpaRepository pedidoRepository;
    private final ObraJpaRepository obraRepository;
    private final FornecedorJpaRepository fornecedorRepository;

    public PedidoCompraRepositoryAdapter(PedidoCompraJpaRepository pedidoRepository,
                                         ObraJpaRepository obraRepository,
                                         FornecedorJpaRepository fornecedorRepository) {
        this.pedidoRepository = pedidoRepository;
        this.obraRepository = obraRepository;
        this.fornecedorRepository = fornecedorRepository;
    }

    @Override
    public PedidoCompra salvar(PedidoCompra pedido) {
        PedidoCompraEntity entity = pedidoRepository.findById(pedido.id()).orElse(null);
        if (entity == null) {
            entity = novaEntity(pedido);
        } else {
            entity.setObservacoes(pedido.observacoes());
            entity.setValorTotal(pedido.valorTotal().valor());
            entity.setSituacao(pedido.situacao());
            entity.setEtapaAtual(pedido.etapaAtual());
            sincronizarEtapas(entity, pedido);
        }
        return PedidoCompraMapper.toDomain(pedidoRepository.save(entity));
    }

    @Override
    public Optional<PedidoCompra> porId(UUID id) {
        return pedidoRepository.findById(id).map(PedidoCompraMapper::toDomain);
    }

    @Override
    public Optional<PedidoCompra> porIdParaAtualizacao(UUID id) {
        return pedidoRepository.porIdParaAtualizacao(id).map(PedidoCompraMapper::toDomain);
    }

    @Override
    public Pagina<PedidoResumo> listar(FiltroPedido filtro) {
        Pageable pageable = PageRequest.of(filtro.pagina(), filtro.tamanho(),
                Sort.by(Sort.Order.desc("criadoEm"), Sort.Order.desc("numero")));
        Page<PedidoCompraEntity> pagina = pedidoRepository.findAll(PedidoCompraSpecification.de(filtro), pageable);

        if (pagina.isEmpty()) {
            return new Pagina<>(List.of(), filtro.pagina(), filtro.tamanho(), pagina.getTotalElements());
        }

        List<UUID> pedidoIds = pagina.getContent().stream()
                .map(PedidoCompraEntity::getId)
                .toList();

        Map<UUID, String> obraCodigos = new HashMap<>();
        Map<UUID, String> obraNomes = new HashMap<>();
        Set<UUID> obraIds = pagina.getContent().stream()
                .map(PedidoCompraEntity::getObraId)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        obraRepository.findAllById(obraIds).forEach(obra -> {
            obraCodigos.put(obra.getId(), obra.getCodigo());
            obraNomes.put(obra.getId(), obra.getNome());
        });

        Map<UUID, String> fornecedorNomes = new HashMap<>();
        Set<UUID> fornecedorIds = pagina.getContent().stream()
                .map(PedidoCompraEntity::getFornecedorId)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        fornecedorRepository.findAllById(fornecedorIds)
                .forEach(fornecedor -> fornecedorNomes.put(fornecedor.getId(), fornecedor.getNome()));

        Map<UUID, Integer> itensPorPedido = new HashMap<>();
        for (ContagemItensProjecao contagem : pedidoRepository.contarItens(pedidoIds)) {
            itensPorPedido.put(contagem.getPedidoId(), (int) contagem.getTotal());
        }

        Map<UUID, List<EtapaResumo>> etapasPorPedido = new HashMap<>();
        for (EtapaProjecao etapa : pedidoRepository.etapasDosPedidos(pedidoIds)) {
            etapasPorPedido.computeIfAbsent(etapa.getPedidoId(), chave -> new ArrayList<>())
                    .add(new EtapaResumo(etapa.getOrdem(), etapa.getUsuarioId(), etapa.getUsuarioNome(),
                            etapa.getSituacao(), etapa.getMotivo(), etapa.getDecididoEm()));
        }

        List<PedidoResumo> conteudo = pagina.getContent().stream()
                .map(entity -> {
                    List<EtapaResumo> etapas = etapasPorPedido.getOrDefault(entity.getId(), List.of());
                    return new PedidoResumo(
                            entity.getId(),
                            entity.getNumero(),
                            entity.getObraId(),
                            obraCodigos.get(entity.getObraId()),
                            obraNomes.get(entity.getObraId()),
                            entity.getFornecedorId(),
                            fornecedorNomes.get(entity.getFornecedorId()),
                            entity.getDataPedido(),
                            entity.getValorTotal(),
                            itensPorPedido.getOrDefault(entity.getId(), 0),
                            entity.getSituacao(),
                            entity.getEtapaAtual(),
                            etapas.size(),
                            etapas,
                            entity.getSolicitanteId());
                })
                .toList();

        return new Pagina<>(conteudo, filtro.pagina(), filtro.tamanho(), pagina.getTotalElements());
    }

    @Override
    public void excluir(UUID id) {
        pedidoRepository.deleteById(id);
    }

    @Override
    public long contarPorNivelAlcada(UUID nivelId) {
        return pedidoRepository.countByNivelAlcadaId(nivelId);
    }

    private PedidoCompraEntity novaEntity(PedidoCompra pedido) {
        PedidoCompraEntity entity = new PedidoCompraEntity();
        entity.setId(pedido.id());
        entity.setNumero(pedido.numero());
        entity.setObraId(pedido.obraId());
        entity.setFornecedorId(pedido.fornecedorId());
        entity.setDataPedido(pedido.dataPedido());
        entity.setObservacoes(pedido.observacoes());
        entity.setSolicitanteId(pedido.solicitanteId());
        entity.setNivelAlcadaId(pedido.nivelOrigemId());
        entity.setValorTotal(pedido.valorTotal().valor());
        entity.setSituacao(pedido.situacao());
        entity.setEtapaAtual(pedido.etapaAtual());
        entity.setCriadoEm(pedido.criadoEm());

        int ordem = 1;
        for (PedidoCompraItem item : pedido.itens()) {
            PedidoCompraItemEntity itemEntity = new PedidoCompraItemEntity();
            itemEntity.setId(UUID.randomUUID());
            itemEntity.setPedido(entity);
            itemEntity.setDescricao(item.descricao());
            itemEntity.setQuantidade(item.quantidade().valor());
            itemEntity.setUnidade(item.unidade());
            itemEntity.setPrecoUnitario(item.precoUnitario().valor());
            itemEntity.setTotal(item.total().valor());
            itemEntity.setOrdem(ordem++);
            entity.getItens().add(itemEntity);
        }

        for (EtapaAlcada etapa : pedido.etapas()) {
            EtapaAlcadaEntity etapaEntity = new EtapaAlcadaEntity();
            etapaEntity.setId(etapa.id());
            etapaEntity.setPedido(entity);
            etapaEntity.setUsuarioId(etapa.usuarioId());
            etapaEntity.setOrdem(etapa.ordem());
            etapaEntity.setSituacao(etapa.situacao());
            etapaEntity.setMotivo(etapa.motivo());
            etapaEntity.setDecididoEm(etapa.decididoEm());
            entity.getEtapas().add(etapaEntity);
        }

        return entity;
    }

    /**
     * Atualiza as etapas ja' persistidas com o estado da decisao, reaproveitando as
     * linhas existentes (a cadeia e' imutavel: apenas a situacao da etapa muda).
     */
    private void sincronizarEtapas(PedidoCompraEntity entity, PedidoCompra pedido) {
        List<EtapaAlcadaEntity> gerenciados = entity.getEtapas();
        Map<UUID, EtapaAlcadaEntity> porId = new HashMap<>();
        for (EtapaAlcadaEntity etapa : gerenciados) {
            porId.put(etapa.getId(), etapa);
        }

        for (EtapaAlcada etapa : pedido.etapas()) {
            EtapaAlcadaEntity alvo = porId.get(etapa.id());
            if (alvo == null) {
                alvo = new EtapaAlcadaEntity();
                alvo.setId(etapa.id());
                alvo.setPedido(entity);
                gerenciados.add(alvo);
                porId.put(etapa.id(), alvo);
            }
            alvo.setUsuarioId(etapa.usuarioId());
            alvo.setOrdem(etapa.ordem());
            alvo.setSituacao(etapa.situacao());
            alvo.setMotivo(etapa.motivo());
            alvo.setDecididoEm(etapa.decididoEm());
        }
    }
}
