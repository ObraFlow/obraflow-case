"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Linha (ou bloco, no celular) de um pedido na lista. Client só pelo movimento: quando o
 * "Agindo como" muda com a lista já montada, as linhas que passam a ser "sua vez" pulsam
 * (docs/design.md). Alternar entre duas animações idênticas reinicia o pulso a cada troca.
 * Na primeira renderização não há troca, logo não há animação.
 */
export function LinhaPedido({
  elemento,
  suaVez,
  usuarioAtualId,
  className,
  children,
}: {
  elemento: "tr" | "div";
  suaVez: boolean;
  usuarioAtualId: number | null;
  className?: string;
  children: React.ReactNode;
}) {
  const [usuarioAnterior, setUsuarioAnterior] = useState(usuarioAtualId);
  const [trocas, setTrocas] = useState(0);
  if (usuarioAtualId !== usuarioAnterior) {
    setUsuarioAnterior(usuarioAtualId);
    setTrocas(trocas + 1);
  }

  const pulso =
    suaVez && trocas > 0 && (trocas % 2 ? "anima-linha-pulsa-a" : "anima-linha-pulsa-b");
  const Tag = elemento;

  return (
    <Tag
      className={cn(
        "transition-[background-color] duration-[450ms] ease-out",
        suaVez && "bg-sinalizacao-fundo",
        pulso,
        className,
      )}
    >
      {children}
    </Tag>
  );
}
