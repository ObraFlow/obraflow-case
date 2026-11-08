import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './styles/base.css'
import './styles/components.css'
import './styles/layout.css'
import { ActorProvider } from './lib/actor'
import { ToastProvider } from './components/Toasts'
import { App } from './App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 5_000 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ActorProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </ActorProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
