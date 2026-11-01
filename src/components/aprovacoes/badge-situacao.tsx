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

/**
 * Situação do pedido sempre com texto; a cor só acompanha. Mesmo badge na lista e no detalhe.
 * O marcador quadrado em `currentColor` dá o segundo sinal além do texto (quadrado, não
 * bolinha: raio 2px em tudo e a marca é feita de lajes).
 */
export function BadgeSituacao({ status, className }: { status: StatusPedido; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 rounded-sm border px-2 text-xs font-semibold whitespace-nowrap before:size-1.5 before:shrink-0 before:rounded-[1px] before:bg-current before:content-['']",
        CLASSE[status],
        className,
      )}
    >
      {ROTULO[status]}
    </span>
  );
}
