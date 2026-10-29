import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { FieldError } from '@/components/FieldError'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import { firstName } from '@/lib/format'
import { maskMoneyInput, parseMaskedMoney } from '@/lib/money'
import type { ApprovalTierWithRange, ConstructionSite, User } from '@/types/api'
import { useSaveTier } from '../api'
import { previousLimit, tierRangeLabel } from '../range'
import { makeTierSchema, type TierForm } from '../schemas'
import { ApproversEditor } from './ApproversEditor'

interface TierDialogProps {
  site: ConstructionSite
  /** Tier being edited; undefined to create a new one. */
  tier?: ApprovalTierWithRange
  tiers: ApprovalTierWithRange[]
  users: User[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Mounted only while open, so the form starts fresh every time. */
export function TierDialog(props: TierDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {props.open && <TierFormContent {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function TierFormContent({ site, tier, tiers, users, onOpenChange }: TierDialogProps) {
  const save = useSaveTier(site.id)
  const [apiError, setApiError] = useState<string>()
  const others = useMemo(() => tiers.filter((t) => t.id !== tier?.id), [tiers, tier])
  const schema = useMemo(() => makeTierSchema(others), [others])

  const form = useForm<TierForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      noLimit: tier ? tier.maxAmount === null : false,
      maxAmount: tier?.maxAmount ? maskMoneyInput(tier.maxAmount.replace('.', ',')) : '',
      approvers: tier?.approvers.map((approver) => ({ userId: approver.userId })) ?? [],
    },
  })
  const { errors } = form.formState
  const maxAmountField = form.register('maxAmount')
  const noLimit = useWatch({ control: form.control, name: 'noLimit' })
  const maxAmount = useWatch({ control: form.control, name: 'maxAmount' })
  const approvers = useWatch({ control: form.control, name: 'approvers' })

  // Live preview of the range this tier will cover, given the other tiers.
  const limit = noLimit ? null : parseMaskedMoney(maxAmount)
  const rangePreview =
    noLimit || limit
      ? tierRangeLabel(
          previousLimit(
            others.map((t) => t.maxAmount),
            limit,
          ),
          limit,
        )
      : null
  const names = approvers
    .map((approver) => users.find((user) => user.id === approver.userId)?.name)
    .filter(Boolean)
    .map((name) => firstName(name!))

  const submit = form.handleSubmit((values) => {
    setApiError(undefined)
    save.mutate(
      {
        tierId: tier?.id,
        input: {
          maxAmount: values.noLimit ? null : parseMaskedMoney(values.maxAmount),
          approverIds: values.approvers.map((approver) => approver.userId),
        },
      },
      {
        onSuccess: () => {
          toast.success(tier ? 'Faixa atualizada.' : 'Faixa criada.')
          onOpenChange(false)
        },
        onError: (error) =>
          setApiError(error instanceof ApiError ? error.message : 'Não foi possível salvar.'),
      },
    )
  })

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{tier ? 'Editar faixa' : 'Nova faixa de alçada'}</DialogTitle>
        <DialogDescription>
          {site.code} · {site.name}. Alterações valem para pedidos criados a partir de agora.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <Label htmlFor="maxAmount">Limite da faixa (valor máximo do pedido)</Label>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-muted-foreground">
            R$
          </span>
          <Input
            id="maxAmount"
            inputMode="decimal"
            placeholder="10.000,00"
            autoComplete="off"
            className="pl-8 tabular-nums"
            disabled={noLimit}
            aria-invalid={!!errors.maxAmount}
            aria-describedby="maxAmount-error"
            {...maxAmountField}
            onChange={(event) => {
              applyMoneyMask(event.target)
              void maxAmountField.onChange(event)
            }}
          />
        </div>
        <FieldError
          id="maxAmount-error"
          message={noLimit ? undefined : errors.maxAmount?.message}
        />
        <div className="flex items-center gap-2">
          <Controller
            control={form.control}
            name="noLimit"
            render={({ field }) => (
              <Checkbox
                id="noLimit"
                checked={field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked === true)
                  void form.trigger('maxAmount')
                }}
                aria-describedby="noLimit-error"
              />
            )}
          />
          <Label htmlFor="noLimit" className="font-normal">
            Sem limite superior (cobre qualquer valor acima das outras faixas)
          </Label>
        </div>
        <FieldError id="noLimit-error" message={errors.noLimit?.message} />
      </div>

      <div className="space-y-2">
        <Label>Aprovadores, na ordem do fluxo</Label>
        <ApproversEditor control={form.control} users={users} invalid={!!errors.approvers} />
        <FieldError id="approvers-error" message={errors.approvers?.message} />
      </div>

      {rangePreview && names.length > 0 && (
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
          <span className="font-medium">{rangePreview}:</span> {names.join(' → ')}
        </p>
      )}

      {apiError && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2 className="animate-spin" />}
          {tier ? 'Salvar alterações' : 'Criar faixa'}
        </Button>
      </DialogFooter>
    </form>
  )
}

/**
 * Masks the input in place and keeps the caret after the same digit, so
 * editing in the middle of "1.234.567" does not jump to the end.
 */
function applyMoneyMask(input: HTMLInputElement) {
  const caret = input.selectionStart ?? input.value.length
  const significantBefore = input.value.slice(0, caret).replace(/[^\d,]/g, '').length
  const masked = maskMoneyInput(input.value)
  input.value = masked

  let position = 0
  for (let seen = 0; position < masked.length && seen < significantBefore; position++) {
    if (/[\d,]/.test(masked[position])) seen++
  }
  input.setSelectionRange(position, position)
}
