package com.obraflow.orders;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class OrderApprovalFlowTest {
    @Test
    void approvalAdvancesOnlyToTheNextApprover() {
        assertEquals(new OrderApprovalFlow.Transition("PENDING", 2),
                OrderApprovalFlow.decide("PENDING", 1, 2, 1, OrderApprovalFlow.Outcome.APPROVED));
    }

    @Test
    void finalApprovalCompletesTheChain() {
        assertEquals(new OrderApprovalFlow.Transition("APPROVED", null),
                OrderApprovalFlow.decide("PENDING", 2, 2, 2, OrderApprovalFlow.Outcome.APPROVED));
    }

    @Test
    void rejectionTerminatesTheChainAtAnyCurrentLevel() {
        assertEquals(new OrderApprovalFlow.Transition("REJECTED", null),
                OrderApprovalFlow.decide("PENDING", 2, 3, 2, OrderApprovalFlow.Outcome.REJECTED));
    }

    @Test
    void rejectsOutOfOrderRepeatedAndTerminalDecisions() {
        assertThrows(IllegalStateException.class, () ->
                OrderApprovalFlow.decide("PENDING", 1, 2, 2, OrderApprovalFlow.Outcome.APPROVED));
        assertThrows(IllegalStateException.class, () ->
                OrderApprovalFlow.decide("APPROVED", 0, 2, 1, OrderApprovalFlow.Outcome.APPROVED));
        assertThrows(IllegalStateException.class, () ->
                OrderApprovalFlow.decide("REJECTED", 0, 2, 1, OrderApprovalFlow.Outcome.REJECTED));
    }
}
