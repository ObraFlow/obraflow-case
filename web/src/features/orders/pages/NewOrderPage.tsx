import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Truck } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { FieldError } from '@/components/FieldError'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useSites, useSuppliers } from '@/features/catalog/api'
import { useApprovalChain } from '@/features/tiers/api'
import { ApiError } from '@/lib/api'
import { firstName, formatCnpj, formatOrderNumber, todayIsoDate } from '@/lib/format'
import { orderTotal } from '@/lib/money'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import type { ConstructionSite, Supplier } from '@/types/api'
import { useCreateOrder } from '../api'
import { ItemsEditor } from '../components/ItemsEditor'
import { OrderSummary, type ChainPreviewState } from '../components/OrderSummary'
import {
  emptyItem,
  orderFormSchema,
  toCreateOrderInput,
  type OrderFormInput,
  type OrderFormOutput,
} from '../schemas'

export function NewOrderPage() {
  const sites = useSites()
  const suppliers = useSuppliers()

  const header = (
    <PageHeader
      title="Novo pedido de compra"
      description="A alçada é definida pelo valor total do pedido e pelas regras da obra."
    />
  )

  if (sites.isPending || suppliers.isPending) {
    return (
      <>
        {header}
        <div className="grid gap-6 lg:grid-cols-3" aria-busy="true" aria-label="Carregando">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </>
    )
  }
  if (sites.isError || suppliers.isError) {
    return (
      <>
        {header}
        <ErrorState
          error={sites.error ?? suppliers.error}
          onRetry={() => {
            void sites.refetch()
            void suppliers.refetch()
          }}
          retrying={sites.isFetching || suppliers.isFetching}
        />
      </>
    )
  }
  if (sites.data.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={Building2}
          title="Nenhuma obra cadastrada"
          description="Pedidos de compra pertencem a uma obra. Cadastre uma obra para começar (os dados de demonstração podem ser carregados com pnpm db:seed)."
        />
      </>
    )
  }
  if (suppliers.data.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={Truck}
          title="Nenhum fornecedor cadastrado"
          description="Cadastre um fornecedor para poder emitir pedidos de compra."
        />
      </>
    )
  }

  return (
    <>
      {header}
      <OrderForm sites={sites.data} suppliers={suppliers.data} />
    </>
  )
}

function OrderForm({ sites, suppliers }: { sites: ConstructionSite[]; suppliers: Supplier[] }) {
  const navigate = useNavigate()
  const createOrder = useCreateOrder()
  // One key per form: retries of this submission never create a second order.
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const [submitError, setSubmitError] = useState<string>()

  const form = useForm<OrderFormInput, unknown, OrderFormOutput>({
    resolver: zodResolver(orderFormSchema),
    mode: 'onTouched',
    defaultValues: {
      siteId: '',
      supplierId: '',
      orderDate: todayIsoDate(),
      notes: '',
      items: [emptyItem],
    },
  })
  const { errors, touchedFields, isSubmitted, isValid } = form.formState
  const show = (field: 'siteId' | 'supplierId' | 'orderDate' | 'notes') =>
    touchedFields[field] || isSubmitted ? errors[field]?.message : undefined

  const siteId = useWatch({ control: form.control, name: 'siteId' })
  const items = useWatch({ control: form.control, name: 'items' })
  const total = orderTotal(items)
  const site = sites.find((s) => s.id === siteId)

  // Ask the API which chain applies, after the user stops typing.
  const amount = useDebouncedValue(total.toFixed(2))
  const chainQuery = useApprovalChain(siteId || undefined, total.isZero() ? null : amount)
  const chain: ChainPreviewState = !siteId
    ? { kind: 'no-site' }
    : total.isZero()
      ? { kind: 'no-total' }
      : chainQuery.isError
        ? { kind: 'unavailable' }
        : chainQuery.data && !chainQuery.isPlaceholderData && amount === total.toFixed(2)
          ? { kind: 'ready', preview: chainQuery.data }
          : { kind: 'loading' }

  const submit = form.handleSubmit((values) => {
    setSubmitError(undefined)
    createOrder.mutate(
      { input: toCreateOrderInput(values), idempotencyKey },
      {
        onSuccess: (order) => {
          const first = order.steps[0]?.approver
          toast.success(
            `${formatOrderNumber(order.number)} cadastrado.` +
              (first ? ` Aguardando aprovação de ${firstName(first.name)}.` : ''),
          )
          navigate(`/pedidos/${order.id}`)
        },
        onError: (error) =>
          setSubmitError(
            error instanceof ApiError ? error.message : 'Erro inesperado ao cadastrar o pedido.',
          ),
      },
    )
  })

  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados gerais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="siteId">Obra</Label>
              <Controller
                control={form.control}
                name="siteId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="siteId"
                      className="w-full"
                      onBlur={field.onBlur}
                      aria-invalid={!!show('siteId')}
                      aria-describedby="siteId-error"
                    >
                      <SelectValue placeholder="Selecione a obra" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.code} · {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError id="siteId-error" message={show('siteId')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="supplierId">Fornecedor</Label>
              <Controller
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="supplierId"
                      className="w-full"
                      onBlur={field.onBlur}
                      aria-invalid={!!show('supplierId')}
                      aria-describedby="supplierId-error"
                    >
                      <SelectValue placeholder="Selecione o fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                          <span className="text-xs text-muted-foreground">
                            {formatCnpj(supplier.taxId)}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError id="supplierId-error" message={show('supplierId')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="orderDate">Data do pedido</Label>
              <Input
                id="orderDate"
                type="date"
                aria-invalid={!!show('orderDate')}
                aria-describedby="orderDate-error"
                {...form.register('orderDate')}
              />
              <FieldError id="orderDate-error" message={show('orderDate')} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">
                Observações internas{' '}
                <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Justificativa ou informações para os aprovadores."
                aria-invalid={!!show('notes')}
                aria-describedby="notes-error"
                {...form.register('notes')}
              />
              <FieldError id="notes-error" message={show('notes')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Itens do pedido</CardTitle>
            <CardDescription>
              O total de cada item é calculado automaticamente (quantidade × preço unitário).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ItemsEditor control={form.control} register={form.register} />
            {isSubmitted && errors.items?.root?.message && (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {errors.items.root.message}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:sticky lg:top-20">
        <OrderSummary
          itemCount={items.length}
          total={total}
          chain={chain}
          siteLabel={site ? `${site.code} · ${site.name}` : undefined}
          canSubmit={isValid}
          submitting={createOrder.isPending}
          submitError={submitError}
        />
      </div>
    </form>
  )
}
