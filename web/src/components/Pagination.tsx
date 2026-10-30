import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="mt-4 flex items-center justify-between gap-4 text-sm text-muted-foreground">
      <span>
        {from}–{to} de {total}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
        >
          Próxima
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
