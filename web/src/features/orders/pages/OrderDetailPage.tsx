import { ArrowLeft, FileQuestion } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ApprovalChainTimeline } from '@/components/ApprovalChain'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api'
import { formatCnpj, formatDate, formatDateTime, formatOrderNumber } from '@/lib/format'
import { formatBRL } from '@/lib/money'
import { useOrder } from '../api'
import { DecisionPanel } from '../components/DecisionPanel'
import { ItemsTable } from '../components/ItemsTable'
import { OrderHistory } from '../components/OrderHistory'

export function OrderDetailPage() {
  const { id = '' } = useParams()
  const order = useOrder(id)

  const back = (
    <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
      <Link to="/pedidos">
        <ArrowLeft />
        Pedidos
      </Link>
    </Button>
  )

  if (order.isPending) {
    return (
      <>
        {back}
        <DetailSkeleton />
      </>
    )
  }
  if (order.isError) {
    // 400 = malformed id in the URL; for the user it is the same as not found.
    const notFound = order.error instanceof ApiError && [400, 404].includes(order.error.status)
    return (
      <>
        {back}
        {notFound ? (
          <EmptyState
            icon={FileQuestion}
            title="Pedido não encontrado"
            description="O pedido não existe ou você não participa dele (como solicitante ou aprovador)."
          />
        ) : (
          <ErrorState
            error={order.error}
            onRetry={() => order.refetch()}
            retrying={order.isFetching}
          />
        )}
      </>
    )
  }

  const data = order.data
  const itemCount = data.items.length

  return (
    <>
      {back}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {formatOrderNumber(data.number)}
            </h1>
            <StatusBadge status={data.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Criado por {data.requester.name} em {formatDateTime(data.createdAt)}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs text-muted-foreground">Valor total</p>
          <p className="text-2xl font-semibold tabular-nums">{formatBRL(data.total)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="order-2 space-y-6 lg:order-1 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Itens</CardTitle>
              <CardDescription>
                {itemCount === 1 ? '1 item' : `${itemCount} itens`}. Totais calculados pelo
                servidor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ItemsTable items={data.items} total={data.total} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
              <CardDescription>Registro de todas as ações sobre o pedido.</CardDescription>
            </CardHeader>
            <CardContent>
              <OrderHistory events={data.events} />
            </CardContent>
          </Card>
        </div>

        <div className="order-1 space-y-6 lg:order-2">
          <DecisionPanel order={data} />
          <Card>
            <CardHeader>
              <CardTitle>Cadeia de aprovação</CardTitle>
              <CardDescription>Definida pela regra da obra na criação do pedido.</CardDescription>
            </CardHeader>
            <CardContent>
              <ApprovalChainTimeline steps={data.steps} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Informações</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <Info label="Obra">
                  {data.site.code} · {data.site.name}
                </Info>
                <Info label="Fornecedor">
                  {data.supplier.name}
                  <span className="block text-xs text-muted-foreground">
                    CNPJ {formatCnpj(data.supplier.taxId)}
                  </span>
                </Info>
                <Info label="Data do pedido">{formatDate(data.orderDate)}</Info>
                <Info label="Solicitante">{data.requester.name}</Info>
                <Info label="Observações internas">
                  {data.notes ? (
                    <span className="whitespace-pre-line">{data.notes}</span>
                  ) : (
                    <span className="text-muted-foreground">Nenhuma</span>
                  )}
                </Info>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando pedido" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 lg:col-span-2" />
        <Skeleton className="h-72" />
      </div>
    </div>
  )
}
