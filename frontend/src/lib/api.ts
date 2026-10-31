import type { ApprovalRange, Project, PurchaseOrder, Supplier, User } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar à API. Verifique se o servidor está no ar.');
  }

  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) message = Array.isArray(body.message) ? body.message.join(' ') : body.message;
    } catch {
      /* sem corpo JSON */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface CreateOrderItemPayload {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}
export interface CreateOrderPayload {
  projectId: string;
  supplierId: string;
  orderDate: string;
  notes?: string;
  items: CreateOrderItemPayload[];
}
export interface RangePayload {
  minValue: number;
  maxValue: number | null;
  approverUserIds: string[];
}
export interface OrderFilters {
  status?: string;
  currentApproverId?: string;
}

export const api = {
  projects: { list: () => request<Project[]>('/projects') },
  users: { list: () => request<User[]>('/users') },
  suppliers: { list: () => request<Supplier[]>('/suppliers') },
  rules: {
    listByProject: (projectId: string) => request<ApprovalRange[]>(`/projects/${projectId}/approval-ranges`),
    create: (projectId: string, payload: RangePayload) =>
      request<ApprovalRange>(`/projects/${projectId}/approval-ranges`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (rangeId: string, payload: Partial<RangePayload>) =>
      request<ApprovalRange>(`/approval-ranges/${rangeId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    remove: (rangeId: string) => request<{ id: string }>(`/approval-ranges/${rangeId}`, { method: 'DELETE' }),
  },
  orders: {
    list: (filters: OrderFilters = {}) => {
      const p = new URLSearchParams();
      if (filters.status) p.set('status', filters.status);
      if (filters.currentApproverId) p.set('currentApproverId', filters.currentApproverId);
      const qs = p.toString();
      return request<PurchaseOrder[]>(`/purchase-orders${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => request<PurchaseOrder>(`/purchase-orders/${id}`),
    create: (payload: CreateOrderPayload) =>
      request<PurchaseOrder>('/purchase-orders', { method: 'POST', body: JSON.stringify(payload) }),
    approve: (id: string, actingUserId: string) =>
      request<PurchaseOrder>(`/purchase-orders/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ actingUserId }),
      }),
    reject: (id: string, actingUserId: string, reason: string) =>
      request<PurchaseOrder>(`/purchase-orders/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ actingUserId, reason }),
      }),
  },
};
