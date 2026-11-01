package com.obraflow.orders;

import com.obraflow.orders.dto.OrderDtos.CreateOrderRequest;
import com.obraflow.orders.dto.OrderDtos.DecisionRequest;
import com.obraflow.orders.dto.OrderDtos.OrderItemInput;
import com.obraflow.orders.dto.OrderDtos.OrderItemResponse;
import com.obraflow.orders.dto.OrderDtos.OrderApproverResponse;
import com.obraflow.orders.dto.OrderDtos.OrderResponse;
import com.obraflow.orders.repository.OrderRepository;
import com.obraflow.orders.service.OrderService;
import com.obraflow.reference.dto.ReferenceDtos.ApproverResponse;
import com.obraflow.reference.dto.ReferenceDtos.BandResponse;
import com.obraflow.reference.repository.ApprovalBandRepository;
import com.obraflow.reference.repository.ReferenceRepository;
import com.obraflow.shared.error.ApiException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class OrderServiceTest {
    private final ReferenceRepository references = mock(ReferenceRepository.class);
    private final ApprovalBandRepository bands = mock(ApprovalBandRepository.class);
    private final OrderRepository orders = mock(OrderRepository.class);
    private final OrderService service = new OrderService(references, bands, orders, new OrderTotals());

    @Test
    void choosesApprovalBandByOrderTotalAndPersistsItsOrderedApprovers() {
        when(references.workExists(1)).thenReturn(true);
        when(references.activeSupplierExists(2)).thenReturn(true);
        when(bands.findByWorkId(1)).thenReturn(List.of(
                new BandResponse(10, BigDecimal.ZERO, new BigDecimal("100.00"), 1,
                        List.of(new ApproverResponse(4, "Ana", "ana@example.com", 1))),
                new BandResponse(11, new BigDecimal("100.00"), null, 2,
                        List.of(new ApproverResponse(4, "Ana", "ana@example.com", 1),
                                new ApproverResponse(5, "Beto", "beto@example.com", 2)))));
        CreateOrderRequest request = request(List.of(
                new OrderItemInput("Material", new BigDecimal("5.000"), "un", new BigDecimal("15.00")),
                new OrderItemInput("Serviço", new BigDecimal("1.000"), "h", new BigDecimal("40.00"))));
        BandResponse selectedBand = bands.findByWorkId(1).get(1);
        OrderResponse expected = new OrderResponse(20, 1, "Obra", 2, "Fornecedor",
                LocalDate.parse("2026-10-29"), "Observação", List.of(
                new OrderItemResponse(1, 1, "Material", new BigDecimal("5.000"), "un",
                        new BigDecimal("15.00"), new BigDecimal("75.00")),
                new OrderItemResponse(2, 2, "Serviço", new BigDecimal("1.000"), "h",
                        new BigDecimal("40.00"), new BigDecimal("40.00"))), new BigDecimal("115.00"), 11,
                "PENDING", 1, List.of(new OrderApproverResponse(4, "Ana", "ana@example.com", 1),
                new OrderApproverResponse(5, "Beto", "beto@example.com", 2)), List.of());
        when(orders.create(request, List.of(new BigDecimal("75.00"), new BigDecimal("40.00")),
                new BigDecimal("115.00"), selectedBand)).thenReturn(expected);

        OrderResponse response = service.create(request);

        assertEquals(new BigDecimal("115.00"), response.total());
        verify(orders).create(request, List.of(new BigDecimal("75.00"), new BigDecimal("40.00")),
                new BigDecimal("115.00"), selectedBand);
    }

    @Test
    void rejectsOrderWhenWorkHasNoApplicableApprovalBand() {
        when(references.workExists(1)).thenReturn(true);
        when(references.activeSupplierExists(2)).thenReturn(true);
        when(bands.findByWorkId(1)).thenReturn(List.of());

        ApiException exception = assertThrows(ApiException.class, () -> service.create(request(List.of(
                new OrderItemInput("Material", new BigDecimal("1.000"), "un", new BigDecimal("1.00"))))));

        assertEquals(400, exception.status().value());
        verifyNoInteractions(orders);
    }

    @Test
    void acceptsDecisionOnlyFromCurrentApproverAndRecordsIt() {
        OrderResponse expected = new OrderResponse(20, 1, "Obra", 2, "Fornecedor",
                LocalDate.parse("2026-10-29"), null, List.of(), BigDecimal.ONE, 10, "APPROVED",
                null, List.of(), List.of());
        when(orders.lockApprovalState(20)).thenReturn(java.util.Optional.of(
                new OrderRepository.ApprovalState("PENDING", 1, 1, 4L)));
        when(orders.findById(20)).thenReturn(java.util.Optional.of(expected));

        assertEquals("APPROVED", service.decide(20,
                new DecisionRequest(4L, OrderApprovalFlow.Outcome.APPROVED, null)).status());

        verify(orders).recordDecision(20, 1, 4, OrderApprovalFlow.Outcome.APPROVED, null,
                new OrderApprovalFlow.Transition("APPROVED", null));
    }

    @Test
    void rejectsARequestFromAnApproverOutsideTheCurrentStep() {
        when(orders.lockApprovalState(20)).thenReturn(java.util.Optional.of(
                new OrderRepository.ApprovalState("PENDING", 1, 2, 4L)));

        ApiException exception = assertThrows(ApiException.class, () -> service.decide(20,
                new DecisionRequest(5L, OrderApprovalFlow.Outcome.APPROVED, null)));

        assertEquals(400, exception.status().value());
        verify(orders).lockApprovalState(20);
        verifyNoMoreInteractions(orders);
    }

    @Test
    void requiresARejectionReasonBeforePersistence() {
        ApiException exception = assertThrows(ApiException.class, () -> service.decide(20,
                new DecisionRequest(4L, OrderApprovalFlow.Outcome.REJECTED, "  ")));

        assertEquals("Informe o motivo da rejeição.", exception.getMessage());
        verifyNoInteractions(orders);
    }

    private static CreateOrderRequest request(List<OrderItemInput> items) {
        return new CreateOrderRequest(1L, 2L, LocalDate.parse("2026-10-29"), "Observação", items);
    }
}
