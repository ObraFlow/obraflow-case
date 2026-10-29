package com.obraflow.orders;

/** Pure approval-chain transitions, independent from persistence and HTTP. */
public final class OrderApprovalFlow {
    private OrderApprovalFlow() { }

    public static Transition decide(String status, int currentPosition, int approverCount,
                                    int decisionPosition, Outcome outcome) {
        if (!"PENDING".equals(status)) throw new IllegalStateException("O pedido não está pendente.");
        if (currentPosition < 1 || currentPosition > approverCount)
            throw new IllegalStateException("O pedido não possui uma etapa de aprovação disponível.");
        if (decisionPosition != currentPosition)
            throw new IllegalStateException("A decisão não corresponde à etapa atual da alçada.");
        if (outcome == Outcome.REJECTED) return new Transition("REJECTED", null);
        if (currentPosition == approverCount) return new Transition("APPROVED", null);
        return new Transition("PENDING", currentPosition + 1);
    }

    public enum Outcome { APPROVED, REJECTED }

    public record Transition(String status, Integer currentPosition) { }
}
