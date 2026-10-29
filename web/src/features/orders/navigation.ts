import { useLocation } from 'react-router'

const LIST_PATH = '/pedidos'

interface FromListState {
  /** The list URL (tab, filters, sort, page) the user opened the order from. */
  from: string
}

/** History state for links from the list into an order. */
export function useFromListState(): FromListState {
  const location = useLocation()
  return { from: location.pathname + location.search }
}

/**
 * Where "back" goes from an order: the list exactly as the user left it, or
 * the default list when the order was opened directly (link, new tab).
 */
export function useBackToListPath(): string {
  const state = useLocation().state as Partial<FromListState> | null
  return state?.from?.startsWith(LIST_PATH) ? state.from : LIST_PATH
}
