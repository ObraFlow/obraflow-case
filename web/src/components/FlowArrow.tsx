import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Vertical line ending in a down arrow: links one step to the next in
 * timelines (history, approval chain). It stretches to fill its container.
 */
export function FlowArrow({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('flex flex-col items-center text-muted-foreground/50', className)}
    >
      <span className="w-px flex-1 bg-current" />
      <ChevronDown className="-mt-[9px] size-4 shrink-0" strokeWidth={2} />
    </span>
  )
}
