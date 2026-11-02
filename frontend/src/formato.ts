import type { StatusPedido } from "./tipos";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatarReais = (centavos: number) => moeda.format(centavos / 100);

export const formatarData = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

export const formatarDataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export const ROTULO_STATUS: Record<StatusPedido, string> = {
  PENDENTE: "Pendente",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
};

// aceita "1.234,56", "1234,56" e "1234.56". Devolve NaN se não for um número
export function lerNumero(texto: string): number {
  let limpo = texto.trim();
  if (!limpo) return NaN;
  if (limpo.includes(",")) limpo = limpo.replace(/\./g, "").replace(",", ".");
  return /^-?\d+(\.\d+)?$/.test(limpo) ? Number(limpo) : NaN;
}