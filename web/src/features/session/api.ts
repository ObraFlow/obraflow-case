import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { User } from '@/types/api'

const sessionKey = ['session'] as const

/** The logged-in user (null when nobody was selected yet). */
export function useSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: () => api.get<{ user: User | null }>('/session'),
    staleTime: Infinity,
  })
}

/** The logged-in user, for components rendered inside SessionGate. */
export function useCurrentUser(): User {
  const { data } = useSession()
  if (!data?.user) {
    throw new Error('useCurrentUser must be used inside SessionGate')
  }
  return data.user
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.post<{ user: User }>('/session', { userId }),
    onSuccess: (data) => {
      // Lists depend on who is looking ("awaiting my approval"), so drop the cache.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'session' })
      queryClient.setQueryData(sessionKey, data)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete('/session'),
    onSuccess: () => queryClient.setQueryData(sessionKey, { user: null }),
  })
}
