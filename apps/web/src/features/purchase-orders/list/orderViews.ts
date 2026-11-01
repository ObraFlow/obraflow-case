import type { OrderDistribution } from "@dokimos/shared";

export const orderViews = [
  { key: "all", label: "Todos", status: "" },
  { key: "mine", label: "Sua decisão", status: "" },
  { key: "pending", label: "Pendentes", status: "PENDING" },
  { key: "approved", label: "Aprovados", status: "APPROVED" },
  { key: "rejected", label: "Rejeitados", status: "REJECTED" },
] as const;
export type OrderView = (typeof orderViews)[number];

/** Tab sizes come from the list response's distribution (all visible orders in the project,
 * not the current page and not narrowed by the selected view). */
export function viewCounts(distribution: OrderDistribution): Record<OrderView["key"], number> {
  return {
    all: distribution.total,
    mine: distribution.actionableByMe,
    pending: distribution.byStatus.PENDING,
    approved: distribution.byStatus.APPROVED,
    rejected: distribution.byStatus.REJECTED,
  };
}
