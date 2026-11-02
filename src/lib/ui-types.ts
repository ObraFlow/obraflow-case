export interface Entity {
  id: string;
  name: string;
}
export interface Page<T> {
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}
export interface Rules {
  projectId: string;
  version: number;
  bands: { upperLimit: string | null; approvers: Entity[] }[];
}
export type OrderStatus = "PENDING" | "APPROVED" | "REJECTED";
export interface Step {
  id: string;
  position: number;
  approver: Entity;
  status: "APPROVED" | "REJECTED" | "CURRENT" | "UPCOMING" | "SKIPPED";
}
export interface Order {
  id: string;
  project: Entity;
  supplier: Entity;
  requester: Entity;
  orderDate: string;
  createdAt: string;
  itemCount: number;
  total: string;
  status: OrderStatus;
  version: number;
  approval: {
    completedCount: number;
    stepCount: number;
    currentStepPosition: number | null;
    steps: Step[];
  };
  permissions: { canDecide: boolean; blockedReason: string | null };
}
export interface OrderDetail extends Order {
  notes: string | null;
  ruleSnapshot: { version: number; upperLimit: string | null };
  items: {
    position: number;
    description: string;
    quantity: string;
    unit: string;
    unitPrice: string;
    lineTotal: string;
  }[];
  history: {
    id: string;
    stepId: string;
    stepPosition: number;
    actor: Entity;
    outcome: "APPROVE" | "REJECT";
    reason: string | null;
    decidedAt: string;
  }[];
}
export const statusLabels = { PENDING: "Pendente", APPROVED: "Aprovado", REJECTED: "Rejeitado" };
export const stepLabels = {
  CURRENT: "Aguardando decisão",
  UPCOMING: "Próxima etapa",
  APPROVED: "Aprovou",
  REJECTED: "Rejeitou",
  SKIPPED: "Não executada",
};

// Fixed precision throughout the client: cents × thousandths, HALF_UP per item.
export function decimal(value: string, precision: number): bigint | null {
  const normalized = value.trim().replace(",", ".");
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${precision}})?$`).test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * 10n ** BigInt(precision) + BigInt(fraction.padEnd(precision, "0"));
}
export function fixed(value: bigint, precision: number): string {
  const scale = 10n ** BigInt(precision);
  return `${value / scale}.${(value % scale).toString().padStart(precision, "0")}`;
}
export function money(value: string | bigint): string {
  const cents = typeof value === "bigint" ? value : (decimal(value, 2) ?? 0n);
  const [whole, fraction] = fixed(cents, 2).split(".");
  return `R$ ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${fraction}`;
}
export function lineCents(quantity: string, price: string): bigint | null {
  const q = decimal(quantity, 3),
    p = decimal(price, 2);
  return q === null || p === null ? null : (q * p + 500n) / 1000n;
}
export function dateLabel(value: string): string {
  return value.slice(0, 10).split("-").reverse().join("/");
}
export function instantLabel(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Bahia",
  }).format(new Date(value));
}
export function shortId(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}
