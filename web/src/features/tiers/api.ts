import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ApprovalChainPreview } from '@/types/api'

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
