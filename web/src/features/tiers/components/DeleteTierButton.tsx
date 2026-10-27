import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { useDeleteTier } from '../api'

interface DeleteTierButtonProps {
  siteId: string
  tierId: string
  label: string
}

export function DeleteTierButton({ siteId, tierId, label }: DeleteTierButtonProps) {
  const remove = useDeleteTier(siteId)

  function confirm() {
    remove.mutate(tierId, {
      onSuccess: () => toast.success('Faixa removida.'),
      onError: (error) =>
        toast.error(error instanceof ApiError ? error.message : 'Não foi possível remover.'),
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={remove.isPending}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 />
          Remover
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover a faixa “{label}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Novos pedidos nesse intervalo de valor passam a usar a faixa seguinte, ou ficam sem
            regra. Pedidos já criados não são afetados: eles guardam a própria cadeia.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={confirm}>
            Remover faixa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
