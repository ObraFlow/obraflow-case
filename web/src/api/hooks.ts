import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type {
  Dashboard,
  NewOrderPayload,
  OrderDetail,
  OrderStats,
  OrderStatus,
  OrderSummary,
  Site,
  Supplier,
  Tier,
  TierPayload,
  User,
} from './types'

export const useUsers = () => useQuery({ queryKey: ['users'], queryFn: () => api.get<User[]>('/users') })
export const useSites = () => useQuery({ queryKey: ['sites'], queryFn: () => api.get<Site[]>('/sites') })
export const useSuppliers = () => useQuery({ queryKey: ['suppliers'], queryFn: () => api.get<Supplier[]>('/suppliers') })
export const useUnits = () => useQuery({ queryKey: ['units'], queryFn: () => api.get<string[]>('/units'), staleTime: Infinity })

export type OrderFilter = { status?: OrderStatus; siteId?: number; awaiting?: 'me'; actorId?: number | null }

export function useOrders(filter: OrderFilter) {
  const params = new URLSearchParams()
  if (filter.status) params.set('status', filter.status)
  if (filter.siteId) params.set('siteId', String(filter.siteId))
  if (filter.awaiting) params.set('awaiting', 'me')
  return useQuery({
    // actorId entra na chave: trocar quem está atuando refaz a busca
    queryKey: ['orders', filter],
    queryFn: () => api.get<OrderSummary[]>(`/orders?${params}`),
    placeholderData: keepPreviousData,
    // "aguardando você" só faz sentido depois de saber quem está atuando
    enabled: !filter.awaiting || !!filter.actorId,
  })
}

// a chave começa com 'orders': qualquer invalidação de pedidos atualiza o resumo
export const useOrderStats = (actorId: number | null, siteId?: number) =>
  useQuery({
    queryKey: ['orders', 'stats', actorId, siteId],
    queryFn: () => api.get<OrderStats>(`/orders/stats${siteId ? `?siteId=${siteId}` : ''}`),
    enabled: !!actorId,
    placeholderData: keepPreviousData,
  })

// mesma raiz 'orders': aprovar ou criar pedido atualiza o painel junto
export const useDashboard = (siteId?: number) =>
  useQuery({
    queryKey: ['orders', 'dashboard', siteId],
    queryFn: () => api.get<Dashboard>(`/dashboard${siteId ? `?siteId=${siteId}` : ''}`),
    placeholderData: keepPreviousData,
  })

export const useOrder = (id: number | null) =>
  useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get<OrderDetail>(`/orders/${id}`),
    enabled: id !== null,
  })

export function useTiers(siteId: number | null) {
  return useQuery({
    queryKey: ['tiers', siteId],
    queryFn: () => api.get<Tier[]>(`/sites/${siteId}/tiers`),
    enabled: siteId !== null,
  })
}

export function useChainPreview(siteId: number | null, totalCents: number) {
  return useQuery({
    queryKey: ['chain-preview', siteId, totalCents],
    queryFn: () => api.get<{ tier: Tier | null }>(`/sites/${siteId}/chain-preview?totalCents=${totalCents}`),
    enabled: siteId !== null,
    placeholderData: keepPreviousData,
  })
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: NewOrderPayload) => api.post<OrderDetail>('/orders', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['sites'] })
    },
  })
}

export function useDecision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      reason === undefined ? api.post<OrderDetail>(`/orders/${id}/approve`) : api.post<OrderDetail>(`/orders/${id}/reject`, { reason }),
    onSuccess: (order) => {
      qc.setQueryData(['order', order.id], order)
      qc.invalidateQueries({ queryKey: ['orders'] })
      // o gasto aprovado de cada obra mudou
      qc.invalidateQueries({ queryKey: ['sites'] })
    },
    // decisão recusada (fora de ordem, outra pessoa decidiu antes...): recarrega o real
    onError: (_err, { id }) => {
      qc.invalidateQueries({ queryKey: ['order', id] })
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useTierMutations(siteId: number | null) {
  const qc = useQueryClient()
  const onSuccess = (tiers: Tier[]) => {
    qc.setQueryData(['tiers', siteId], tiers)
    qc.invalidateQueries({ queryKey: ['sites'] })
    qc.invalidateQueries({ queryKey: ['chain-preview'] })
  }
  return {
    create: useMutation({
      mutationFn: (payload: TierPayload) => api.post<Tier[]>(`/sites/${siteId}/tiers`, payload),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: ({ id, ...payload }: TierPayload & { id: number }) => api.put<Tier[]>(`/tiers/${id}`, payload),
      onSuccess,
    }),
    remove: useMutation({ mutationFn: (id: number) => api.delete<Tier[]>(`/tiers/${id}`), onSuccess }),
  }
}
