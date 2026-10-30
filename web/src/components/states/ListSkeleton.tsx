import { Skeleton } from '@/components/ui/skeleton'

/** Loading placeholder for lists: keeps the layout stable while data arrives. */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 rounded-xl border bg-card p-4">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="hidden h-6 w-20 sm:block" />
        </div>
      ))}
    </div>
  )
}
