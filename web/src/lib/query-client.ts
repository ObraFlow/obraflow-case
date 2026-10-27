import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from './api'

/** A 401 means the session cookie is gone: send the user back to the picker. */
function handleUnauthorized(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    queryClient.setQueryData(['session'], { user: null })
  }
}

export const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleUnauthorized }),
  mutationCache: new MutationCache({ onError: handleUnauthorized }),
  defaultOptions: {
    queries: {
      // Retry only when the server may recover (network/5xx). A 404 or 400
      // will not change by retrying, so the error is shown right away.
      retry: (failureCount, error) =>
        error instanceof ApiError && error.isServerProblem && failureCount < 2,
      staleTime: 15_000,
    },
  },
})
