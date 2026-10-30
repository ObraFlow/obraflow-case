'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  approvalRulesApi,
  projectsApi,
  purchaseOrdersApi,
  suppliersApi,
  usersApi,
} from './endpoints';
import type {
  ApprovalRuleInput,
  CreatePurchaseOrderInput,
  Money,
  PurchaseOrderFilters,
} from './types';

/**
 * Chaves de cache centralizadas. As mutações invalidam por prefixo:
 * invalidar ['purchase-orders'] atualiza a lista, os contadores e os detalhes de uma vez.
 */
export const queryKeys = {
  users: ['users'] as const,
  projects: ['projects'] as const,
  suppliers: (q = '') => ['suppliers', q] as const,
  approvalRules: (projectId: number) => ['approval-rules', projectId] as const,
  resolveRule: (projectId: number, amount: Money) =>
    ['approval-rules', projectId, 'resolve', amount] as const,
  purchaseOrders: ['purchase-orders'] as const,
  purchaseOrderList: (filters: PurchaseOrderFilters) =>
    ['purchase-orders', 'list', filters] as const,
  purchaseOrder: (id: number) => ['purchase-orders', 'detail', id] as const,
};

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export function useUsers() {
  return useQuery({ queryKey: queryKeys.users, queryFn: usersApi.list });
}

export function useProjects() {
  return useQuery({ queryKey: queryKeys.projects, queryFn: projectsApi.list });
}

export function useSuppliers(q = '') {
  return useQuery({
    queryKey: queryKeys.suppliers(q),
    queryFn: () => suppliersApi.list(q || undefined),
    placeholderData: keepPreviousData,
  });
}

export function useApprovalRules(projectId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.approvalRules(projectId ?? 0),
    queryFn: () => approvalRulesApi.list(projectId!),
    enabled: projectId !== undefined,
  });
}

/** Prévia da cadeia para um valor (painel do formulário e "Testar valor"). */
export function useResolveRule(
  projectId: number | undefined,
  amount: Money | undefined,
) {
  return useQuery({
    queryKey: queryKeys.resolveRule(projectId ?? 0, amount ?? ''),
    queryFn: ({ signal }) =>
      approvalRulesApi.resolve(projectId!, amount!, signal),
    enabled: projectId !== undefined && amount !== undefined,
    placeholderData: keepPreviousData,
  });
}

export function usePurchaseOrders(
  filters: PurchaseOrderFilters,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.purchaseOrderList(filters),
    queryFn: () => purchaseOrdersApi.list(filters),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

export function usePurchaseOrder(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.purchaseOrder(id ?? 0),
    queryFn: () => purchaseOrdersApi.get(id!),
    enabled: id !== undefined,
  });
}

// ---------------------------------------------------------------------------
// Mutações
// ---------------------------------------------------------------------------

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePurchaseOrderInput) =>
      purchaseOrdersApi.create(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders }),
  });
}

/** Aprovar/rejeitar. Também invalida em caso de erro: um 409 significa que a tela está desatualizada. */
export function useDecision() {
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders });

  const approve = useMutation({
    mutationFn: ({ orderId, stepId }: { orderId: number; stepId: number }) =>
      purchaseOrdersApi.approve(orderId, stepId),
    onSettled: refresh,
  });
  const reject = useMutation({
    mutationFn: ({
      orderId,
      stepId,
      reason,
    }: {
      orderId: number;
      stepId: number;
      reason: string;
    }) => purchaseOrdersApi.reject(orderId, stepId, reason),
    onSettled: refresh,
  });
  return { approve, reject };
}

/** Criar/editar/remover faixa: atualiza as faixas da obra e a cobertura na lista de obras. */
export function useApprovalRuleMutations(projectId: number) {
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['approval-rules', projectId],
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
    ]);

  return {
    create: useMutation({
      mutationFn: (input: ApprovalRuleInput) =>
        approvalRulesApi.create(projectId, input),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: number; input: ApprovalRuleInput }) =>
        approvalRulesApi.update(id, input),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: number) => approvalRulesApi.remove(id),
      onSuccess: refresh,
    }),
  };
}
