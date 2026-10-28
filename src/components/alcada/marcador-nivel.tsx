"use client";

import { CLASSE_POR_ESTADO } from "@/components/alcada/estado-nivel";
import { useTransicaoNivel } from "@/components/alcada/use-transicao-nivel";
import type { EstadoNivel } from "@/lib/cadeia";
import { cn } from "@/lib/utils";

/**
 * Marcador numerado de 28px da timeline do detalhe, com o mesmo esquema de cor dos blocos
 * (docs/design.md). O número é decorativo: a ordem já está na lista e o estado é dito em texto.
 */
export function MarcadorNivel({ numero, estado }: { numero: number; estado: EstadoNivel }) {
  const animacao = useTransicaoNivel(estado);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-sm border text-xs font-bold tabular-nums",
        CLASSE_POR_ESTADO[estado],
        estado === "cancelado" && "no-underline",
        animacao,
      )}
    >
      {numero}
    </span>
  );
}
