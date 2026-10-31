import {
  api,
  type CreateOrderPayload,
  type OrderFilters,
  type RangePayload,
} from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const keys = {
  projects: ["projects"] as const,
  users: ["users"] as const,
  suppliers: ["suppliers"] as const,
  rules: (projectId: string) => ["rules", projectId] as const,
  orders: (filters: OrderFilters) => ["orders", filters] as const,
  order: (id: string) => ["order", id] as const,
};

export const useProjects = () =>
  useQuery({ queryKey: keys.projects, queryFn: api.projects.list });
export const useUsers = () =>
  useQuery({ queryKey: keys.users, queryFn: api.users.list });
export const useSuppliers = () =>
  useQuery({ queryKey: keys.suppliers, queryFn: api.suppliers.list });

export const useRules = (projectId: string | null) =>
  useQuery({
    queryKey: keys.rules(projectId ?? ""),
    queryFn: () => api.rules.listByProject(projectId!),
    enabled: !!projectId,
  });

export const useOrders = (filters: OrderFilters) =>
  useQuery({
    queryKey: keys.orders(filters),
    queryFn: () => api.orders.list(filters),
  });

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => api.orders.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useDecision() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["orders"] });
  return {
    approve: useMutation({
      mutationFn: ({
        id,
        actingUserId,
      }: {
        id: string;
        actingUserId: string;
      }) => api.orders.approve(id, actingUserId),
      onSuccess: invalidate,
    }),
    reject: useMutation({
      mutationFn: ({
        id,
        actingUserId,
        reason,
      }: {
        id: string;
        actingUserId: string;
        reason: string;
      }) => api.orders.reject(id, actingUserId, reason),
      onSuccess: invalidate,
    }),
  };
}

export function useRuleMutations(projectId: string | null) {
  const qc = useQueryClient();
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: keys.rules(projectId ?? "") });
  return {
    create: useMutation({
      mutationFn: (payload: RangePayload) =>
        api.rules.create(projectId!, payload),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({
        id,
        payload,
      }: {
        id: string;
        payload: Partial<RangePayload>;
      }) => api.rules.update(id, payload),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.rules.remove(id),
      onSuccess: invalidate,
    }),
  };
}
