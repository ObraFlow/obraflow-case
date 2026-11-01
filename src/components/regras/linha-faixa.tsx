"use client";

import { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";

const ContextoIdsIniciais = createContext<ReadonlySet<number> | null>(null);

/**
 * Envolve as linhas da tabela de faixas (que continuam Server Components) e guarda os ids
 * que existiam na primeira renderização. Quem chama dá `key={obraId}`: trocar de obra
 * remonta a lista, e as faixas da outra obra não contam como novas.
 */
export function ListaFaixas({ ids, children }: { ids: number[]; children: React.ReactNode }) {
  const [idsIniciais] = useState(() => new Set(ids));
  return (
    <ContextoIdsIniciais.Provider value={idsIniciais}>{children}</ContextoIdsIniciais.Provider>
  );
}

/**
 * Linha (ou bloco, no celular) de uma faixa. Client só pelo movimento (docs/design.md):
 * uma faixa que não existia ao montar a lista entra com `linha-entra`; uma faixa cuja
 * `assinatura` (valores e aprovadores) mudou com a linha já montada também. Alternar entre
 * duas animações idênticas reinicia o destaque a cada edição. No carregamento da página
 * todas as faixas já são conhecidas, logo nada anima: mesmo padrão da `LinhaPedido`.
 */
export function LinhaFaixa({
  elemento,
  id,
  assinatura,
  className,
  children,
}: {
  elemento: "tr" | "div";
  id: number;
  assinatura: string;
  className?: string;
  children: React.ReactNode;
}) {
  const idsIniciais = useContext(ContextoIdsIniciais);
  const [assinaturaAnterior, setAssinaturaAnterior] = useState(assinatura);
  const [mudancas, setMudancas] = useState(0);
  if (assinatura !== assinaturaAnterior) {
    setAssinaturaAnterior(assinatura);
    setMudancas(mudancas + 1);
  }

  const nova = idsIniciais !== null && !idsIniciais.has(id);
  const destaque =
    (nova || mudancas > 0) && (mudancas % 2 ? "anima-linha-entra-b" : "anima-linha-entra-a");
  const Tag = elemento;

  return <Tag className={cn(destaque, className)}>{children}</Tag>;
}
