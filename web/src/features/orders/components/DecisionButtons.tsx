import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Loader2, X } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api'
import { formatOrderNumber } from '@/lib/format'
import { formatBRL } from '@/lib/money'
import { useApproveOrder, useRejectOrder } from '../api'
import type { DecidableOrder } from '../decision'
import { MAX_REASON, rejectSchema, type RejectForm } from '../schemas'

type Size = 'sm' | 'default'

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Não foi possível registrar a decisão.'
}

interface ApproveButtonProps {
  order: DecidableOrder
  /** Name of the next approver, or null when this is the last step. */
  nextApprover: string | null
  size?: Size
}

export function ApproveButton({ order, nextApprover, size = 'default' }: ApproveButtonProps) {
  const approve = useApproveOrder()
  const number = formatOrderNumber(order.number)

  function confirm() {
    approve.mutate(
      { id: order.id, version: order.version },
      {
        onSuccess: (updated) =>
          toast.success(
            updated.status === 'APPROVED'
              ? `${number} aprovado. A cadeia de aprovação foi concluída.`
              : `${number} aprovado por você. Segue para ${nextApprover}.`,
          ),
        onError: (error) => toast.error(errorMessage(error)),
      },
    )
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size={size}
          disabled={approve.isPending}
          onClick={(event) => event.stopPropagation()}
        >
          {approve.isPending ? <Loader2 className="animate-spin" /> : <Check />}
          Aprovar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(event) => event.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Aprovar {number}?</AlertDialogTitle>
          <AlertDialogDescription>
            Valor total de {formatBRL(order.total)}.{' '}
            {nextApprover
              ? `Depois da sua aprovação, o pedido segue para ${nextApprover}.`
              : 'Esta é a última etapa: o pedido ficará aprovado.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirm}>Aprovar pedido</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function RejectButton({ order, size = 'default' }: { order: DecidableOrder; size?: Size }) {
  const [open, setOpen] = useState(false)
  const reject = useRejectOrder()
  const number = formatOrderNumber(order.number)
  const form = useForm<RejectForm>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { reason: '' },
  })
  const reason = useWatch({ control: form.control, name: 'reason' })
  const error = form.formState.errors.reason

  function changeOpen(next: boolean) {
    setOpen(next)
    if (!next) form.reset()
  }

  // The reason is validated here, before any request is sent.
  const submit = form.handleSubmit(({ reason }) => {
    reject.mutate(
      { id: order.id, version: order.version, reason },
      {
        onSuccess: () => {
          toast.success(`${number} rejeitado. O fluxo de aprovação foi encerrado.`)
          changeOpen(false)
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    )
  })

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button
          size={size}
          variant="destructive"
          disabled={reject.isPending}
          onClick={(event) => event.stopPropagation()}
        >
          <X />
          Rejeitar
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(event) => event.stopPropagation()} className="sm:max-w-md">
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Rejeitar {number}</DialogTitle>
            <DialogDescription>
              A rejeição encerra o fluxo: as etapas seguintes são canceladas e o motivo fica
              registrado no histórico do pedido.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`reason-${order.id}`}>Motivo da rejeição</Label>
            <Textarea
              id={`reason-${order.id}`}
              rows={4}
              placeholder="Ex.: preço acima do contrato vigente; solicitar nova cotação."
              aria-invalid={!!error}
              aria-describedby={`reason-${order.id}-help`}
              {...form.register('reason')}
            />
            <div
              id={`reason-${order.id}-help`}
              className="flex justify-between gap-2 text-xs text-muted-foreground"
            >
              <span className={error ? 'text-destructive' : undefined}>
                {error?.message ?? 'Obrigatório.'}
              </span>
              <span className={reason.length > MAX_REASON ? 'text-destructive' : undefined}>
                {reason.length}/{MAX_REASON}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => changeOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={reject.isPending}>
              {reject.isPending && <Loader2 className="animate-spin" />}
              Rejeitar pedido
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
