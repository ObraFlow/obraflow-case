import type { StatusPedido } from "@/domain/alcada/tipos";
import { cn } from "@/lib/utils";

const ROTULO: Record<StatusPedido, string> = {
  PENDENTE: "Pendente",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
};

/* Aprovado e rejeitado diferem em luminosidade, não só em matiz (docs/design.md). */
const CLASSE: Record<StatusPedido, string> = {
  PENDENTE: "border-border bg-card text-foreground",
  APROVADO: "border-aprovado-fundo bg-aprovado-fundo text-aprovado",
  REJEITADO: "border-rejeitado-fundo bg-rejeitado-fundo text-rejeitado",
};

/** Situação do pedido sempre com texto; a cor só acompanha. Mesmo badge na lista e no detalhe. */
export function BadgeSituacao({ status, className }: { status: StatusPedido; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-sm border px-2 text-xs font-semibold whitespace-nowrap",
        CLASSE[status],
        className,
      )}
    >
      {ROTULO[status]}
    </span>
  );
}
