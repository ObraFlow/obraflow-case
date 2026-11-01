export type Work = { id: number; name: string; code: string }
export type User = { id: number; name: string; email: string; active: boolean }
export type Band = { id?: number; minAmount: number; maxAmount: number | null; approverIds: number[] }

export type BandResponse = {
  id: number
  minAmount: number
  maxAmount: number | null
  approvers: Array<{ id: number }>
}

export function toEditableBand(band: BandResponse): Band {
  return {
    id: band.id,
    minAmount: band.minAmount,
    maxAmount: band.maxAmount,
    approverIds: band.approvers.map(approver => approver.id),
  }
}
