import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatBRL, formatQuantity } from '@/lib/money'
import type { OrderItem } from '@/types/api'

export function ItemsTable({ items, total }: { items: OrderItem[]; total: string }) {
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">Preço unitário</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-muted-foreground">{item.position}</TableCell>
                <TableCell className="whitespace-normal">{item.description}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatQuantity(item.quantity)}
                </TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBRL(item.unitPrice)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatBRL(item.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={5} className="text-right">
                Total do pedido
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatBRL(total)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Phones: one line per item instead of a wide table. */}
      <ul className="divide-y md:hidden">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4 py-3 first:pt-0">
            <div className="min-w-0">
              <p className="text-sm">{item.description}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatQuantity(item.quantity)} {item.unit} × {formatBRL(item.unitPrice)}
              </p>
            </div>
            <p className="shrink-0 text-sm font-medium tabular-nums">{formatBRL(item.total)}</p>
          </li>
        ))}
        <li className="flex justify-between pt-3 text-sm font-semibold">
          <span>Total do pedido</span>
          <span className="tabular-nums">{formatBRL(total)}</span>
        </li>
      </ul>
    </>
  )
}
