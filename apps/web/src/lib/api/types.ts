// Tipos das respostas e payloads da API — espelham docs/api-contract.md.
// Dinheiro e quantidade chegam como string decimal ("12500.00"), nunca como number.

export type Money = string;
export type DecimalString = string;
/** Data sem hora: "2026-10-22". */
export type DateOnly = string;
/** Timestamp ISO 8601. */
export type DateTime = string;

export type OrderStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type StepStatus =
  'WAITING' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
export type Unit = 'un' | 'kg' | 'm' | 'm2' | 'm3' | 'h' | 'sc' | 'l';
export type HistoryType = 'CREATED' | 'APPROVED' | 'REJECTED';
export type CoverageStatus = 'NONE' | 'PARTIAL' | 'FULL';

export interface ListResponse<T> {
  data: T[];
}

// ---------------------------------------------------------------------------
// Cadastros
// ---------------------------------------------------------------------------

export interface UserSummary {
  id: number;
  name: string;
  jobTitle: string;
  initials: string;
}

export interface User extends UserSummary {
  email: string;
}

export interface Project {
  id: number;
  name: string;
  city: string | null;
  ruleCount: number;
  coverage: CoverageStatus;
}

export interface Supplier {
  id: number;
  name: string;
  taxId: string | null;
}

// ---------------------------------------------------------------------------
// Regras de alçada
// ---------------------------------------------------------------------------

export interface ApprovalRule {
  id: number;
  position: number;
  fromAmount: Money;
  /** null = "sem limite". */
  maxAmount: Money | null;
  approvers: { position: number; user: UserSummary }[];
  updatedAt: DateTime;
}

export interface ApprovalRulesResponse extends ListResponse<ApprovalRule> {
  projectId: number;
  coverage: { status: CoverageStatus; uncoveredFrom: Money | null };
}

export interface ApprovalRuleInput {
  maxAmount: Money | null;
  /** Ordem do array = ordem do fluxo. */
  approverIds: number[];
}

export type ResolveRuleResponse =
  | { amount: Money; matched: true; rule: ApprovalRule }
  | { amount: Money; matched: false; rule: null; message: string };

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------

export interface ApprovalStep {
  id: number;
  position: number;
  status: StepStatus;
  approver: UserSummary;
  decidedAt: DateTime | null;
}

export interface PurchaseOrderSummary {
  id: number;
  code: string;
  orderDate: DateOnly;
  project: { id: number; name: string };
  supplier: { id: number; name: string };
  requester: UserSummary;
  itemCount: number;
  totalAmount: Money;
  status: OrderStatus;
  /** Posição da etapa atual; null quando o fluxo terminou. */
  currentStep: number | null;
  steps: ApprovalStep[];
  createdAt: DateTime;
}

export interface PurchaseOrderItem {
  id: number;
  position: number;
  description: string;
  quantity: DecimalString;
  unit: Unit;
  unitPrice: Money;
  total: Money;
}

export interface HistoryEvent {
  id: number;
  type: HistoryType;
  actor: { id: number; name: string };
  at: DateTime;
  stepPosition: number | null;
  reason: string | null;
}

export interface PurchaseOrderDetail extends PurchaseOrderSummary {
  notes: string | null;
  appliedRule: { fromAmount: Money; maxAmount: Money | null };
  items: PurchaseOrderItem[];
  history: HistoryEvent[];
}

export interface PurchaseOrderList extends ListResponse<PurchaseOrderSummary> {
  meta: { page: number; pageSize: number; total: number };
  counts: {
    awaiting: number | null;
    pending: number;
    approved: number;
    rejected: number;
    all: number;
  };
}

export interface PurchaseOrderFilters {
  status?: OrderStatus;
  projectId?: number;
  awaitingUserId?: number;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface CreatePurchaseOrderInput {
  projectId: number;
  supplierId: number;
  requesterId: number;
  orderDate: DateOnly;
  notes?: string;
  items: {
    description: string;
    quantity: DecimalString;
    unit: Unit;
    unitPrice: Money;
  }[];
}

// ---------------------------------------------------------------------------
// Erros
// ---------------------------------------------------------------------------

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'STEP_NOT_CURRENT'
  | 'ORDER_ALREADY_DECIDED'
  | 'DUPLICATE_LIMIT'
  | 'UNLIMITED_RULE_EXISTS'
  | 'DUPLICATE_EMAIL'
  | 'NO_APPROVAL_RULE'
  | 'INVALID_REFERENCE'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR'
  /** Gerado no front: a API não respondeu (fora do ar, sem rede, CORS). */
  | 'NETWORK_ERROR';

export interface ErrorDetail {
  /** Caminho do campo: "items.1.quantity". */
  field: string;
  message: string;
}
