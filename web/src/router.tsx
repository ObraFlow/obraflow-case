import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { NewOrderPage } from '@/features/orders/pages/NewOrderPage'
import { OrderDetailPage } from '@/features/orders/pages/OrderDetailPage'
import { OrdersPage } from '@/features/orders/pages/OrdersPage'
import { TiersPage } from '@/features/tiers/pages/TiersPage'
import { NotFoundPage } from '@/NotFoundPage'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/pedidos" replace /> },
      { path: 'pedidos', element: <OrdersPage /> },
      { path: 'pedidos/novo', element: <NewOrderPage /> },
      { path: 'pedidos/:id', element: <OrderDetailPage /> },
      { path: 'regras-de-alcada', element: <TiersPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
