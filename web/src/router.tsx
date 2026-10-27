import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { NotFoundPage } from '@/NotFoundPage'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/pedidos" replace /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
