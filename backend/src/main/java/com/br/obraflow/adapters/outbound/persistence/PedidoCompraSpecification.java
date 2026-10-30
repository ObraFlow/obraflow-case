package com.br.obraflow.adapters.outbound.persistence;

import com.br.obraflow.adapters.outbound.persistence.entity.EtapaAlcadaEntity;
import com.br.obraflow.adapters.outbound.persistence.entity.FornecedorEntity;
import com.br.obraflow.adapters.outbound.persistence.entity.ObraEntity;
import com.br.obraflow.adapters.outbound.persistence.entity.PedidoCompraEntity;
import com.br.obraflow.core.domain.pedido.FiltroPedido;
import com.br.obraflow.core.domain.pedido.SituacaoEtapa;
import com.br.obraflow.core.domain.pedido.SituacaoPedido;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Traduz o {@link FiltroPedido} do dominio em criterios de consulta.
 * <p>
 * Usar {@code Specification} (e nao JPQL com parameters anulados) evita que um filtro
 * nao informado vire {@code WHERE coluna = null}, que nunca encontra registros.
 */
final class PedidoCompraSpecification {

    private PedidoCompraSpecification() {
    }

    static Specification<PedidoCompraEntity> de(FiltroPedido filtro) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (filtro.situacao() != null) {
                predicates.add(cb.equal(root.get("situacao"), filtro.situacao()));
            }
            if (filtro.obraId() != null) {
                predicates.add(cb.equal(root.get("obraId"), filtro.obraId()));
            }
            if (filtro.fornecedorId() != null) {
                predicates.add(cb.equal(root.get("fornecedorId"), filtro.fornecedorId()));
            }
            if (filtro.aprovadorId() != null) {
                predicates.add(existeEtapaDoAprovador(root, query, cb, filtro.aprovadorId()));
            }
            if (filtro.busca() != null) {
                predicates.add(contemTermo(root, query, cb, filtro.busca()));
            }
            if (filtro.aguardandoDecisaoDe() != null) {
                predicates.add(aguardandoDecisaoDe(root, query, cb, filtro.aguardandoDecisaoDe()));
            }

            return predicates.isEmpty()
                    ? cb.conjunction()
                    : cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Busca livre por numero do pedido, nome/codigo da obra ou nome do fornecedor.
     */
    private static Predicate contemTermo(Root<PedidoCompraEntity> root,
                                         CriteriaQuery<?> query,
                                         CriteriaBuilder cb,
                                         String termo) {
        String padrao = "%" + termo.toLowerCase() + "%";

        Subquery<UUID> obras = query.subquery(UUID.class);
        Root<ObraEntity> obra = obras.from(ObraEntity.class);
        obras.select(obra.get("id")).where(cb.or(
                cb.like(cb.lower(obra.get("nome")), padrao),
                cb.like(cb.lower(obra.get("codigo")), padrao)));

        Subquery<UUID> fornecedores = query.subquery(UUID.class);
        Root<FornecedorEntity> fornecedor = fornecedores.from(FornecedorEntity.class);
        fornecedores.select(fornecedor.get("id"))
                .where(cb.like(cb.lower(fornecedor.get("nome")), padrao));

        return cb.or(
                cb.like(cb.lower(root.get("numero")), padrao),
                root.get("obraId").in(obras),
                root.get("fornecedorId").in(fornecedores));
    }

    /**
     * Pedidos pendentes cuja etapa corrente aguarda decisao do usuario indicado
     * ("esta na sua vez") - usado pelo sino de notificacoes.
     */
    private static Predicate aguardandoDecisaoDe(Root<PedidoCompraEntity> root,
                                                 CriteriaQuery<?> query,
                                                 CriteriaBuilder cb,
                                                 UUID usuarioId) {
        Subquery<Integer> subquery = query.subquery(Integer.class);
        Root<EtapaAlcadaEntity> etapa = subquery.from(EtapaAlcadaEntity.class);
        subquery.select(cb.literal(1))
                .where(cb.equal(etapa.get("pedido"), root),
                        cb.equal(etapa.get("usuarioId"), usuarioId),
                        cb.equal(etapa.get("situacao"), SituacaoEtapa.PENDENTE),
                        cb.equal(etapa.get("ordem"), root.get("etapaAtual")),
                        cb.equal(root.get("situacao"), SituacaoPedido.PENDENTE));
        return cb.exists(subquery);
    }

    private static Predicate existeEtapaDoAprovador(Root<PedidoCompraEntity> root,
                                                    CriteriaQuery<?> query,
                                                    CriteriaBuilder cb,
                                                    UUID aprovadorId) {
        Subquery<Integer> subquery = query.subquery(Integer.class);
        Root<EtapaAlcadaEntity> etapa = subquery.from(EtapaAlcadaEntity.class);
        subquery.select(cb.literal(1))
                .where(cb.equal(etapa.get("pedido"), root),
                        cb.equal(etapa.get("usuarioId"), aprovadorId));
        return cb.exists(subquery);
    }
}
