import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  ApprovalChainPreview,
  ApprovalTier,
  ApprovalTierInput,
  ApprovalTierWithRange,
} from '@/types/api'

/** Tiers of a site, lowest limit first, with the derived minAmount. */
export function useTiers(siteId: string | undefined) {
  return useQuery({
    queryKey: ['tiers', siteId],
    queryFn: () => api.get<ApprovalTierWithRange[]>(`/construction-sites/${siteId}/approval-tiers`),
    enabled: !!siteId,
  })
}

/** Which chain the API would apply to this amount (tier is null when none covers it). */
export function useApprovalChain(siteId: string | undefined, amount: string | null) {
  return useQuery({
    queryKey: ['approval-chain', siteId, amount],
    queryFn: () =>
      api.get<ApprovalChainPreview>(`/construction-sites/${siteId}/approval-chain`, { amount }),
    enabled: !!siteId && amount !== null,
    placeholderData: keepPreviousData,
  })
}

function refreshTiers(queryClient: QueryClient, siteId: string) {
  void queryClient.invalidateQueries({ queryKey: ['tiers', siteId] })
  // Chain previews in the order form depend on the tiers.
  void queryClient.invalidateQueries({ queryKey: ['approval-chain', siteId] })
}

/** Creates a tier, or replaces it when tierId is given (approvers in final order). */
export function useSaveTier(siteId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ tierId, input }: { tierId?: string; input: ApprovalTierInput }) =>
      tierId
        ? api.put<ApprovalTier>(`/approval-tiers/${tierId}`, input)
        : api.post<ApprovalTier>(`/construction-sites/${siteId}/approval-tiers`, input),
    onSuccess: () => refreshTiers(queryClient, siteId),
  })
}

export function useDeleteTier(siteId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tierId: string) => api.delete(`/approval-tiers/${tierId}`),
    onSuccess: () => refreshTiers(queryClient, siteId),
  })
}
