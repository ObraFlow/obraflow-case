import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
export function formatCurrency(value: number): string {
  return currency.format(value ?? 0);
}

const qty = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });
export function formatQuantity(value: number): string {
  return qty.format(value ?? 0);
}

const dateFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
export function formatDate(value: string | Date): string {
  return dateFmt.format(typeof value === "string" ? new Date(value) : value);
}

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
export function formatDateTime(value: string | Date): string {
  return dateTimeFmt.format(
    typeof value === "string" ? new Date(value) : value,
  );
}

/** Identificador curto para exibição (o id é um uuid). */
export function shortId(id: string): string {
  return "PC-" + id.slice(0, 6).toUpperCase();
}

/** Iniciais para avatar (ex.: "João Pereira" -> "JP"). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")
  ).toUpperCase();
}
