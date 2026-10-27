import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { OrderDetailPage } from '@/features/orders/pages/OrderDetailPage'
import { OrdersPage } from '@/features/orders/pages/OrdersPage'
import { NotFoundPage } from '@/NotFoundPage'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/pedidos" replace /> },
      { path: 'pedidos', element: <OrdersPage /> },
      { path: 'pedidos/:id', element: <OrderDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
