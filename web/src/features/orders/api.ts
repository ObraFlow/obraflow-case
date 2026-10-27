import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { OrderDetail, OrderListItem, OrderStatus, Page } from '@/types/api'

export interface OrderFilters {
  status?: OrderStatus
  siteId?: string
  awaitingApprover?: string
  page?: number
  pageSize?: number
}

export function useOrders(filters: OrderFilters) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => api.get<Page<OrderListItem>>('/purchase-orders', { ...filters }),
    // Keeps the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get<OrderDetail>(`/purchase-orders/${id}`),
  })
}

interface DecisionInput {
  id: string
  version: number
}

/**
 * Approve or reject. The version the user saw is sent back: if someone else
 * decided in the meantime the API answers 409, and the data is refreshed.
 */
function useDecision<T extends DecisionInput>(action: 'approve' | 'reject') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: T) =>
      api.post<OrderDetail>(`/purchase-orders/${id}/${action}`, body),
    onSuccess: (order) => {
      queryClient.setQueryData(['order', order.id], order)
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (_error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['order', id] })
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export const useApproveOrder = () => useDecision<DecisionInput>('approve')

export const useRejectOrder = () => useDecision<DecisionInput & { reason: string }>('reject')
