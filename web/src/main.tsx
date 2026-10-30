import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SessionGate } from '@/features/session/SessionGate'
import { queryClient } from '@/lib/query-client'
import { router } from '@/router'
import './index.css'

function resetToHome() {
  void router.navigate('/pedidos', { replace: true })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SessionGate onSignOut={resetToHome}>
          <RouterProvider router={router} />
        </SessionGate>
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
)
