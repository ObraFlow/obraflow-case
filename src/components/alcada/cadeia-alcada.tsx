import { cn } from "@/lib/utils";

/** Estado de um aprovador dentro da cadeia (docs/design.md > Componentes próprios). */
export type EstadoNivel = "proximo" | "herdado" | "atual" | "aprovou" | "rejeitou" | "cancelado";

export type NivelCadeia = {
  nome: string;
  estado: EstadoNivel;
};

const CLASSE_POR_ESTADO: Record<EstadoNivel, string> = {
  proximo: "border-border bg-card text-muted-foreground",
  herdado: "border-border bg-muted text-muted-foreground",
  atual: "border-sinalizacao bg-sinalizacao font-bold text-foreground",
  aprovou: "border-foreground bg-foreground text-white",
  rejeitou: "border-rejeitado bg-rejeitado text-white",
  cancelado: "border-border bg-card text-cancelado line-through",
};

const TEXTO_POR_ESTADO: Record<EstadoNivel, string> = {
  proximo: "ainda não decidiu",
  herdado: "herdado de uma faixa abaixo, ainda não decidiu",
  atual: "é a vez de decidir",
  aprovou: "aprovou",
  rejeitou: "rejeitou",
  cancelado: "não chegou a decidir",
};

/**
 * Blocos lado a lado, um por aprovador, na ordem em que decidem. Usado na tela de regras
 * (todos "proximo"), no preview do pedido e na lista/detalhe de aprovações.
 * O estado é dito em texto para leitor de tela; a cor só acompanha.
 */
export function CadeiaAlcada({ niveis, className }: { niveis: NivelCadeia[]; className?: string }) {
  return (
    <ol
      className={cn("flex flex-wrap items-center gap-0.5", className)}
      aria-label="Cadeia de aprovação"
    >
      {niveis.map((nivel, indice) => (
        <li
          key={`${indice}-${nivel.nome}`}
          className={cn(
            "rounded-sm border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
            CLASSE_POR_ESTADO[nivel.estado],
          )}
        >
          {nivel.nome}
          <span className="sr-only">, {TEXTO_POR_ESTADO[nivel.estado]}</span>
        </li>
      ))}
    </ol>
  );
}
