import { api } from './client';
import type {
  ApprovalRule,
  ApprovalRuleInput,
  ApprovalRulesResponse,
  CreatePurchaseOrderInput,
  ListResponse,
  Money,
  Project,
  PurchaseOrderDetail,
  PurchaseOrderFilters,
  PurchaseOrderList,
  ResolveRuleResponse,
  Supplier,
  User,
} from './types';

// Uma função por rota do contrato (docs/api-contract.md).

export const usersApi = {
  list: () => api<ListResponse<User>>('/users'),
};

export const projectsApi = {
  list: () => api<ListResponse<Project>>('/projects'),
};

export const suppliersApi = {
  list: (q?: string) =>
    api<ListResponse<Supplier>>('/suppliers', { query: { q } }),
};

export const approvalRulesApi = {
  list: (projectId: number) =>
    api<ApprovalRulesResponse>(`/projects/${projectId}/approval-rules`),
  resolve: (projectId: number, amount: Money, signal?: AbortSignal) =>
    api<ResolveRuleResponse>(`/projects/${projectId}/approval-rules/resolve`, {
      query: { amount },
      signal,
    }),
  create: (projectId: number, input: ApprovalRuleInput) =>
    api<ApprovalRule>(`/projects/${projectId}/approval-rules`, {
      method: 'POST',
      body: input,
    }),
  update: (id: number, input: ApprovalRuleInput) =>
    api<ApprovalRule>(`/approval-rules/${id}`, { method: 'PUT', body: input }),
  remove: (id: number) =>
    api<void>(`/approval-rules/${id}`, { method: 'DELETE' }),
};

export const purchaseOrdersApi = {
  list: (filters: PurchaseOrderFilters) =>
    api<PurchaseOrderList>('/purchase-orders', { query: { ...filters } }),
  get: (id: number) => api<PurchaseOrderDetail>(`/purchase-orders/${id}`),
  create: (input: CreatePurchaseOrderInput) =>
    api<PurchaseOrderDetail>('/purchase-orders', {
      method: 'POST',
      body: input,
    }),
  approve: (id: number, stepId: number) =>
    api<PurchaseOrderDetail>(`/purchase-orders/${id}/approve`, {
      method: 'POST',
      body: { stepId },
    }),
  reject: (id: number, stepId: number, reason: string) =>
    api<PurchaseOrderDetail>(`/purchase-orders/${id}/reject`, {
      method: 'POST',
      body: { stepId, reason },
    }),
};
