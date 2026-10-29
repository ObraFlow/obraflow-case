// Aparência de cada estado de um nível da cadeia (docs/design.md > Componentes próprios).
// Compartilhado pelo bloco horizontal (lista, regras, preview) e pelo marcador da timeline.

import type { EstadoNivel } from "@/lib/cadeia";

export const CLASSE_POR_ESTADO: Record<EstadoNivel, string> = {
  proximo: "border-border bg-card text-muted-foreground",
  // Borda tracejada: "vem de uma faixa abaixo". Só o fundo cinza não se distinguia do branco.
  herdado: "border-dashed border-border bg-muted text-muted-foreground",
  atual: "border-sinalizacao bg-sinalizacao font-bold text-foreground",
  aprovou: "border-foreground bg-foreground text-white",
  rejeitou: "border-rejeitado bg-rejeitado text-white",
  cancelado: "border-border bg-card text-cancelado line-through",
};

/** Dito em texto para leitor de tela; a cor só acompanha. */
export const TEXTO_POR_ESTADO: Record<EstadoNivel, string> = {
  proximo: "ainda não decidiu",
  herdado: "herdado de uma faixa abaixo, ainda não decidiu",
  atual: "é a vez de decidir",
  aprovou: "aprovou",
  rejeitou: "rejeitou",
  cancelado: "não chegou a decidir",
};
