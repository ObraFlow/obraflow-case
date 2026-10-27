import { ChevronRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { ApprovalChainInline } from '@/components/ApprovalChain'
import { StatusBadge } from '@/components/StatusBadge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate, formatOrderNumber } from '@/lib/format'
import { formatBRL } from '@/lib/money'
import type { OrderListItem } from '@/types/api'
import { OrderActions } from './OrderActions'

function itemsLabel(count: number) {
  return count === 1 ? '1 item' : `${count} itens`
}

/** Table on wide screens, cards on phones. */
export function OrdersList({ orders }: { orders: OrderListItem[] }) {
  return (
    <>
      <OrdersTable orders={orders} />
      <ul className="space-y-3 md:hidden">
        {orders.map((order) => (
          <li key={order.id}>
            <OrderCard order={order} />
          </li>
        ))}
      </ul>
    </>
  )
}

function OrdersTable({ orders }: { orders: OrderListItem[] }) {
  const navigate = useNavigate()

  return (
    <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="pl-4">Pedido</TableHead>
            <TableHead>Obra / fornecedor</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Alçada</TableHead>
            <TableHead className="pr-4">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow
              key={order.id}
              className="cursor-pointer"
              onClick={() => navigate(`/pedidos/${order.id}`)}
            >
              <TableCell className="pl-4">
                <Link
                  to={`/pedidos/${order.id}`}
                  className="font-medium hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  {formatOrderNumber(order.number)}
                </Link>
                <div className="text-xs text-muted-foreground">{formatDate(order.orderDate)}</div>
              </TableCell>
              <TableCell className="max-w-64">
                <div className="truncate">
                  <span className="text-muted-foreground">{order.site.code}</span> ·{' '}
                  {order.site.name}
                </div>
                <div className="truncate text-xs text-muted-foreground">{order.supplier.name}</div>
              </TableCell>
              <TableCell className="text-right">
                <div className="font-medium tabular-nums">{formatBRL(order.total)}</div>
                <div className="text-xs text-muted-foreground">{itemsLabel(order.itemCount)}</div>
              </TableCell>
              <TableCell>
                <StatusBadge status={order.status} />
              </TableCell>
              <TableCell className="max-w-72 whitespace-normal">
                <ApprovalChainInline steps={order.steps} />
              </TableCell>
              <TableCell className="pr-4">
                <OrderActions order={order} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function OrderCard({ order }: { order: OrderListItem }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <Link to={`/pedidos/${order.id}`} className="block space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1 font-medium">
              {formatOrderNumber(order.number)}
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDate(order.orderDate)} · {itemsLabel(order.itemCount)}
            </div>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="text-sm">
          <div className="truncate">
            <span className="text-muted-foreground">{order.site.code}</span> · {order.site.name}
          </div>
          <div className="truncate text-muted-foreground">{order.supplier.name}</div>
        </div>
        <div className="text-lg font-semibold tabular-nums">{formatBRL(order.total)}</div>
        <ApprovalChainInline steps={order.steps} />
      </Link>
      <div className="mt-3 border-t pt-3">
        <OrderActions order={order} />
      </div>
    </div>
  )
}
