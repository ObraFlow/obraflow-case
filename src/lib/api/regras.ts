import type { FaixaAplicavelDto } from "@/lib/dto";
import { api } from "./client";

/** Preview da faixa/cadeia para um valor (novo pedido e simulador de regras, enquanto digita). */
export function previewAlcada(obraId: number, valorCents: number): Promise<FaixaAplicavelDto> {
  return api
    .get("regras/aplicavel", { searchParams: { obraId, valorCents } })
    .json<FaixaAplicavelDto>();
}
