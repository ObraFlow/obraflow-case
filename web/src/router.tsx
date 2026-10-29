import { Loader2 } from 'lucide-react'
import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { NotFoundPage } from '@/NotFoundPage'

// Each screen is loaded on demand, so the first visit downloads only the
// layout and the page being opened (forms and their validation libraries
// come with the screens that use them).
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    hydrateFallbackElement: (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Carregando" />
      </div>
    ),
    children: [
      { index: true, element: <Navigate to="/pedidos" replace /> },
      {
        path: 'pedidos',
        lazy: () =>
          import('@/features/orders/pages/OrdersPage').then((m) => ({ Component: m.OrdersPage })),
      },
      {
        path: 'pedidos/novo',
        lazy: () =>
          import('@/features/orders/pages/NewOrderPage').then((m) => ({
            Component: m.NewOrderPage,
          })),
      },
      {
        path: 'pedidos/:id',
        lazy: () =>
          import('@/features/orders/pages/OrderDetailPage').then((m) => ({
            Component: m.OrderDetailPage,
          })),
      },
      {
        path: 'regras-de-alcada',
        lazy: () =>
          import('@/features/tiers/pages/TiersPage').then((m) => ({ Component: m.TiersPage })),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
