"use client";

import { useState } from "react";
import type { EstadoNivel } from "@/lib/cadeia";

/**
 * Classe de animação quando o estado de um nível MUDA com o componente já montado
 * (docs/design.md > Movimento): aprovou → preenche; rejeitou → preenche em vermelho;
 * virou a vez → acende. Na primeira renderização nunca há animação, porque não há
 * estado anterior para comparar: é assim que "nada anima ao carregar a página" se garante.
 *
 * Guardar o estado anterior em `useState` e ajustá-lo durante a renderização é o padrão
 * do React para "reagir a mudança de prop" sem useEffect.
 */
export function useTransicaoNivel(estado: EstadoNivel): string | undefined {
  const [anterior, setAnterior] = useState(estado);
  const [classe, setClasse] = useState<string | undefined>(undefined);

  if (estado !== anterior) {
    setAnterior(estado);
    setClasse(classeDaTransicao(anterior, estado));
  }

  return classe;
}

function classeDaTransicao(de: EstadoNivel, para: EstadoNivel): string | undefined {
  if (de === "atual" && para === "aprovou") return "anima-preenche";
  if (de === "atual" && para === "rejeitou") return "anima-preenche-rejeicao";
  if ((de === "proximo" || de === "herdado") && para === "atual") return "anima-acende";
  return undefined;
}
