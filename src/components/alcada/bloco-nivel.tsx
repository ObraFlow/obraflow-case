"use client";

import { CLASSE_POR_ESTADO, TEXTO_POR_ESTADO } from "@/components/alcada/estado-nivel";
import { useTransicaoNivel } from "@/components/alcada/use-transicao-nivel";
import type { NivelCadeia } from "@/lib/cadeia";
import { cn } from "@/lib/utils";

/** Um bloco da cadeia horizontal. Client só para animar quando o estado muda. */
export function BlocoNivel({ nivel }: { nivel: NivelCadeia }) {
  const animacao = useTransicaoNivel(nivel.estado);

  return (
    <li
      className={cn(
        "rounded-sm border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        CLASSE_POR_ESTADO[nivel.estado],
        animacao,
      )}
    >
      {nivel.nome}
      <span className="sr-only">, {TEXTO_POR_ESTADO[nivel.estado]}</span>
    </li>
  );
}
