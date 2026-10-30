import { MapPinOff } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/states/EmptyState'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <EmptyState
      icon={MapPinOff}
      title="Página não encontrada"
      description="O endereço acessado não existe."
      action={
        <Button asChild variant="outline">
          <Link to="/pedidos">Ir para os pedidos</Link>
        </Button>
      }
    />
  )
}
