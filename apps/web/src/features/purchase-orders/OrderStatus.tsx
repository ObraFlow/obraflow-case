import type { OrderStatus as Status } from "@dokimos/shared";
import { Check, Clock3, X } from "lucide-react";

const statusLabels = { PENDING: "Pendente", APPROVED: "Aprovado", REJECTED: "Rejeitado" };
const statusIcons = { PENDING: Clock3, APPROVED: Check, REJECTED: X };

export function OrderStatus({ status }: { status: Status }) {
  const Icon = statusIcons[status];
  return (
    <span className="status" data-status={status}>
      <Icon aria-hidden="true" size={12} />
      {statusLabels[status]}
    </span>
  );
}
