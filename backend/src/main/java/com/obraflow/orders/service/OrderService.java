package com.obraflow.orders.service;

import com.obraflow.orders.OrderTotals;
import com.obraflow.orders.OrderApprovalFlow;
import com.obraflow.orders.dto.OrderDtos.DecisionRequest;
import com.obraflow.orders.dto.OrderDtos.CreateOrderRequest;
import com.obraflow.orders.dto.OrderDtos.OrderResponse;
import com.obraflow.orders.repository.OrderRepository;
import com.obraflow.reference.dto.ReferenceDtos.BandResponse;
import com.obraflow.reference.repository.ApprovalBandRepository;
import com.obraflow.reference.repository.ReferenceRepository;
import com.obraflow.shared.error.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/** Validates order references, calculates monetary values, and selects the frozen approval chain. */
@Service
public class OrderService {
    private final ReferenceRepository references;
    private final ApprovalBandRepository bands;
    private final OrderRepository orders;
    private final OrderTotals totals;

    public OrderService(ReferenceRepository references, ApprovalBandRepository bands,
                        OrderRepository orders, OrderTotals totals) {
        this.references = references;
        this.bands = bands;
        this.orders = orders;
        this.totals = totals;
    }

    @Transactional
    public OrderResponse create(CreateOrderRequest request) {
        if (!references.workExists(request.workId())) throw ApiException.badRequest("A obra selecionada não existe.");
        if (!references.activeSupplierExists(request.supplierId()))
            throw ApiException.badRequest("Selecione um fornecedor ativo cadastrado.");
        if (request.items() == null || request.items().isEmpty())
            throw ApiException.badRequest("Adicione pelo menos um item ao pedido.");

        List<BigDecimal> itemTotals = request.items().stream()
                .map(item -> totals.lineTotal(item.quantity(), item.unitPrice())).toList();
        BigDecimal orderTotal = totals.total(itemTotals);
        if (orderTotal.precision() > 14)
            throw ApiException.badRequest("O total do pedido excede o limite permitido.");

        BandResponse applicableBand = bands.findByWorkId(request.workId()).stream()
                .filter(band -> orderTotal.compareTo(band.minAmount()) >= 0
                        && (band.maxAmount() == null || orderTotal.compareTo(band.maxAmount()) < 0))
                .findFirst()
                .orElseThrow(() -> ApiException.badRequest(
                        "Não há faixa de aprovação aplicável para esta obra. Configure as regras antes de cadastrar o pedido."));

        return orders.create(request, itemTotals, orderTotal, applicableBand);
    }

    public List<OrderResponse> list() { return orders.findAll(); }

    public OrderResponse get(long id) {
        return orders.findById(id).orElseThrow(() -> ApiException.notFound("Pedido não encontrado."));
    }

    /** Applies one decision to the current chain position under a pessimistic order-row lock. */
    @Transactional
    public OrderResponse decide(long orderId, DecisionRequest request) {
        String reason = request.reason() == null ? null : request.reason().trim();
        if (request.outcome() == OrderApprovalFlow.Outcome.REJECTED && (reason == null || reason.isBlank()))
            throw ApiException.badRequest("Informe o motivo da rejeição.");
        if (request.outcome() == OrderApprovalFlow.Outcome.APPROVED && reason != null && !reason.isBlank())
            throw ApiException.badRequest("A aprovação não deve incluir motivo de rejeição.");

        OrderRepository.ApprovalState state = orders.lockApprovalState(orderId)
                .orElseThrow(() -> ApiException.notFound("Pedido não encontrado."));
        if (state.currentApproverId() == null || !state.currentApproverId().equals(request.approverId()))
            throw ApiException.badRequest("Somente o aprovador atual pode decidir este pedido.");
        OrderApprovalFlow.Transition transition;
        try {
            transition = OrderApprovalFlow.decide(state.status(), state.currentPosition(), state.approverCount(),
                    state.currentPosition(), request.outcome());
        } catch (IllegalStateException exception) {
            throw ApiException.badRequest(exception.getMessage());
        }
        orders.recordDecision(orderId, state.currentPosition(), request.approverId(), request.outcome(),
                request.outcome() == OrderApprovalFlow.Outcome.REJECTED ? reason : null, transition);
        return get(orderId);
    }
}
