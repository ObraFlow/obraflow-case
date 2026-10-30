import Decimal from 'decimal.js';
import type {
  DateOnly,
  DateTime,
  Money,
  OrderStatus,
  StepStatus,
  Unit,
} from './api/types';

// Formatação de valores para exibição (pt-BR).

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });

/**
 * "12500.00" → "R$ 12.500,00".
 * Converter para number aqui é seguro: é só exibição, e o valor tem no máximo 2 casas.
 */
export function formatBRL(value: Money): string {
  return brl.format(Number(value));
}

/** "12.5" → "12,5" */
export function formatQuantity(value: string): string {
  return decimal.format(Number(value));
}

/** "2026-10-18" → "18/10/2026" (sem passar por Date, para não sofrer com fuso horário). */
export function formatDate(value: DateOnly): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

/** ISO → "18/10/2026, 14:32" no fuso de quem está usando. */
export function formatDateTime(value: DateTime): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

/** Data de hoje no formato da API ("2026-10-23"), no fuso local. */
export function todayISO(): DateOnly {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/** Faixa de valor para exibição: "Até R$ 10.000,00", "De R$ 10.000,01 até R$ 50.000,00", "Acima de R$ 50.000,00". */
export function formatRange(
  fromAmount: Money,
  maxAmount: Money | null,
): string {
  if (maxAmount === null) {
    return Number(fromAmount) === 0
      ? 'Qualquer valor'
      : `Acima de ${formatBRL(subtractCent(fromAmount))}`;
  }
  if (Number(fromAmount) === 0) return `Até ${formatBRL(maxAmount)}`;
  return `De ${formatBRL(fromAmount)} até ${formatBRL(maxAmount)}`;
}

/** O início da faixa "sem limite" é o limite anterior + R$ 0,01; "acima de" mostra o limite anterior. */
function subtractCent(value: Money): Money {
  return new Decimal(value).minus('0.01').toFixed(2);
}

export const UNIT_LABELS: Record<Unit, string> = {
  un: 'un',
  kg: 'kg',
  m: 'm',
  m2: 'm²',
  m3: 'm³',
  h: 'h',
  sc: 'sc',
  l: 'l',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
};

export const STEP_STATUS_LABELS: Record<StepStatus, string> = {
  WAITING: 'Aguardando etapa anterior',
  PENDING: 'Aguardando decisão',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  SKIPPED: 'Não chegou a decidir',
};
