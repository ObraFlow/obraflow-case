import { ClipboardCheck, FileSearch, Plus } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { Pagination } from '@/components/Pagination'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { ListSkeleton } from '@/components/states/ListSkeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSites } from '@/features/catalog/api'
import type { OrderStatus } from '@/types/api'
import { useOrders } from '../api'
import { OrdersList } from '../components/OrdersList'

const PAGE_SIZE = 20
const ALL = 'all'

type View = 'mine' | 'all'

const statusOptions: { value: OrderStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'APPROVED', label: 'Aprovados' },
  { value: 'REJECTED', label: 'Rejeitados' },
]

/**
 * Approvals screen. Filters live in the URL (?view=all&status=PENDING&site=...),
 * so the back button and shared links keep them.
 */
export function OrdersPage() {
  const sites = useSites()
  const [params, setParams] = useSearchParams()

  const view: View = params.get('view') === 'all' ? 'all' : 'mine'
  const siteId = params.get('site') ?? undefined
  const status = statusOptions.find((option) => option.value === params.get('status'))?.value
  const page = Number(params.get('page') ?? '1') || 1

  const orders = useOrders(
    view === 'mine'
      ? { awaitingMe: true, siteId, page, pageSize: PAGE_SIZE }
      : { status, siteId, page, pageSize: PAGE_SIZE },
  )
  // Count for the tab badge, independent of the current tab and filters.
  const awaiting = useOrders({ awaitingMe: true, pageSize: 1 })

  function update(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined) next.delete(key)
      else next.set(key, value)
    }
    // Any filter change goes back to the first page.
    if (!('page' in changes)) next.delete('page')
    setParams(next)
  }

  return (
    <>
      <PageHeader
        title="Pedidos de compra"
        actions={
          <Button asChild>
            <Link to="/pedidos/novo">
              <Plus />
              Novo pedido
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={view}
          onValueChange={(value) => update({ view: value === 'all' ? 'all' : undefined })}
        >
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="mine" className="flex-1 sm:flex-none">
              <span className="sm:hidden">Minha aprovação</span>
              <span className="hidden sm:inline">Aguardando minha aprovação</span>
              {!!awaiting.data?.total && (
                <Badge className="ml-1 h-5 min-w-5 px-1.5">{awaiting.data.total}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="flex-1 sm:flex-none">
              Todos os pedidos
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            value={siteId ?? ALL}
            onValueChange={(value) => update({ site: value === ALL ? undefined : value })}
          >
            <SelectTrigger className="w-full sm:w-64" aria-label="Filtrar por obra">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as obras</SelectItem>
              {sites.data?.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.code} · {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {view === 'all' && (
            <Select
              value={status ?? ALL}
              onValueChange={(value) => update({ status: value === ALL ? undefined : value })}
            >
              <SelectTrigger className="w-full sm:w-44" aria-label="Filtrar por situação">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as situações</SelectItem>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {orders.isPending ? (
        <ListSkeleton />
      ) : orders.isError ? (
        <ErrorState
          error={orders.error}
          onRetry={() => orders.refetch()}
          retrying={orders.isFetching}
        />
      ) : orders.data.data.length === 0 ? (
        view === 'mine' && !siteId ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Nada aguardando sua aprovação"
            description="Quando um pedido chegar à sua etapa da alçada, ele aparece aqui."
            action={
              <Button variant="outline" onClick={() => update({ view: 'all' })}>
                Ver todos os pedidos
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={FileSearch}
            title="Nenhum pedido encontrado"
            description="Não há pedidos com os filtros selecionados."
            action={
              <Button
                variant="outline"
                onClick={() => update({ site: undefined, status: undefined })}
              >
                Limpar filtros
              </Button>
            }
          />
        )
      ) : (
        <div className={orders.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
          <OrdersList orders={orders.data.data} />
          <Pagination
            page={orders.data.page}
            pageSize={orders.data.pageSize}
            total={orders.data.total}
            onChange={(next) => update({ page: String(next) })}
          />
        </div>
      )}
    </>
  )
}
