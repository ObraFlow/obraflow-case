import type { FaixaAplicavelDto, RegraDto } from "@/lib/dto";
import { api } from "./client";

/** Preview da faixa/cadeia para um valor (tela de novo pedido, enquanto o usuário digita). */
export function previewAlcada(obraId: number, valorCents: number): Promise<FaixaAplicavelDto> {
  return api
    .get("regras/aplicavel", { searchParams: { obraId, valorCents } })
    .json<FaixaAplicavelDto>();
}

export function listarRegras(obraId: number): Promise<RegraDto[]> {
  return api.get("regras", { searchParams: { obraId } }).json<RegraDto[]>();
}
