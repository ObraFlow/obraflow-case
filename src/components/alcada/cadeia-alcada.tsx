import { BlocoNivel } from "@/components/alcada/bloco-nivel";
import type { NivelCadeia } from "@/lib/cadeia";
import { cn } from "@/lib/utils";

export type { EstadoNivel, NivelCadeia } from "@/lib/cadeia";

/**
 * Blocos lado a lado, um por aprovador, na ordem em que decidem. Usado na tela de regras
 * (todos "proximo"), no preview do pedido e na lista de aprovações (estados reais).
 * Cada bloco é um client component pequeno, só para animar quando o estado muda.
 */
export function CadeiaAlcada({ niveis, className }: { niveis: NivelCadeia[]; className?: string }) {
  return (
    <ol
      className={cn("flex flex-wrap items-center gap-0.5", className)}
      aria-label="Cadeia de aprovação"
    >
      {niveis.map((nivel, indice) => (
        <BlocoNivel key={`${indice}-${nivel.nome}`} nivel={nivel} />
      ))}
    </ol>
  );
}
