import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'agora mesmo';
  if (diffMins < 60) return `${diffMins} min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  return formatDate(d);
}

export const UNIDADES = [
  'un',
  'kg',
  'g',
  't',
  'm',
  'cm',
  'mm',
  'm²',
  'm³',
  'cm²',
  'cm³',
  'l',
  'ml',
  'h',
  'min',
  's',
  'pc',
  'sc',
  'cx',
  'pct',
  'rolo',
  'mtr',
] as const;

export type Unidade = (typeof UNIDADES)[number];

export function isValidUnidade(unidade: string): unidade is Unidade {
  return UNIDADES.includes(unidade as Unidade);
}

export function getSituacaoLabel(situacao: string): string {
  const labels: Record<string, string> = {
    PENDENTE: 'Pendente',
    APROVADO: 'Aprovado',
    REJEITADO: 'Rejeitado',
  };
  return labels[situacao] || situacao;
}

export function getSituacaoVariant(situacao: string): 'default' | 'pending' | 'approved' | 'rejected' {
  const variants: Record<string, 'default' | 'pending' | 'approved' | 'rejected'> = {
    PENDENTE: 'pending',
    APROVADO: 'approved',
    REJEITADO: 'rejected',
  };
  return variants[situacao] || 'default';
}

export function getStatusObraLabel(status: string): string {
  const labels: Record<string, string> = {
    ATIVA: 'Ativa',
    INATIVA: 'Inativa',
  };
  return labels[status] || status;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}