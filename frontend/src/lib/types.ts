export type Decision = 'PENDING' | 'APPROVED' | 'REJECTED';
export type OrderStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Project {
  id: string;
  name: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  document?: string | null;
}

export interface RangeStep {
  id: string;
  rangeId: string;
  userId: string;
  position: number;
  user: User;
}

export interface ApprovalRange {
  id: string;
  projectId: string;
  minValue: number;
  maxValue: number | null;
  approvalRangeSteps: RangeStep[];
}

export interface OrderItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderStep {
  id: string;
  orderId: string;
  position: number;
  userId: string;
  decision: Decision;
  reason: string | null;
  decidedAt: string | null;
  user: User;
}

export interface PurchaseOrder {
  id: string;
  projectId: string;
  supplierId: string;
  orderDate: string;
  notes: string | null;
  totalValue: number;
  status: OrderStatus;
  currentStep: number;
  version: number;
  createdAt: string;
  project: Project;
  supplier: Supplier;
  items: OrderItem[];
  steps: OrderStep[];
}
