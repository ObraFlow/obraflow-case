import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ConstructionSite, Supplier, User } from '@/types/api'

// Reference data changes rarely, so it stays fresh for a few minutes.
const staleTime = 5 * 60_000

export function useSites() {
  return useQuery({
    queryKey: ['sites'],
    queryFn: () => api.get<ConstructionSite[]>('/construction-sites'),
    staleTime,
  })
}

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get<Supplier[]>('/suppliers'),
    staleTime,
  })
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<User[]>('/users'),
    staleTime,
  })
}
