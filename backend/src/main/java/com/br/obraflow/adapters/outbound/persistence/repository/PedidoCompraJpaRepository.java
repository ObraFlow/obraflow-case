package com.br.obraflow.adapters.outbound.persistence.repository;

import com.br.obraflow.adapters.outbound.persistence.entity.EtapaAlcadaEntity;
import com.br.obraflow.adapters.outbound.persistence.entity.PedidoCompraEntity;
import com.br.obraflow.adapters.outbound.persistence.projection.ContagemItensProjecao;
import com.br.obraflow.adapters.outbound.persistence.projection.EtapaProjecao;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repositorio Spring Data dos pedidos de compra.
 * <p>
 * A listagem usa {@link JpaSpecificationExecutor} para composing os filtros de forma
 * segura (sem parameters nulos em JPQL) e as projecioes(batch) para evitar N+1.
 */
public interface PedidoCompraJpaRepository
        extends JpaRepository<PedidoCompraEntity, UUID>, JpaSpecificationExecutor<PedidoCompraEntity> {

    /**
     * Carrega o pedido com bloqueio pessimista de linha (SELECT ... FOR UPDATE),
     * serializando decisoes concorrentes sobre a mesma cadeia de aprovacao.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from PedidoCompraEntity p where p.id = :id")
    Optional<PedidoCompraEntity> porIdParaAtualizacao(@Param("id") UUID id);

    long countByNivelAlcadaId(UUID nivelAlcadaId);

    @Query("""
            select i.pedido.id as pedidoId, count(i.id) as total
            from PedidoCompraItemEntity i
            where i.pedido.id in :pedidoIds
            group by i.pedido.id
            """)
    List<ContagemItensProjecao> contarItens(@Param("pedidoIds") Collection<UUID> pedidoIds);

    @Query("""
            select e.pedido.id as pedidoId,
                   e.ordem as ordem,
                   e.usuarioId as usuarioId,
                   u.nome as usuarioNome,
                   e.situacao as situacao,
                   e.motivo as motivo,
                   e.decididoEm as decididoEm
            from EtapaAlcadaEntity e, UsuarioEntity u
            where u.id = e.usuarioId and e.pedido.id in :pedidoIds
            order by e.pedido.id asc, e.ordem asc
            """)
    List<EtapaProjecao> etapasDosPedidos(@Param("pedidoIds") Collection<UUID> pedidoIds);
}
