import { cn } from '@/lib/utils'

/** Rejection reason quoted under a step or history event. */
export function RejectionReason({ reason, className }: { reason: string; className?: string }) {
  return (
    <blockquote
      className={cn(
        'mt-2 rounded-md border-l-2 border-red-300 bg-red-50/60 px-3 py-2 text-sm text-red-950',
        className,
      )}
    >
      <span className="font-semibold">Motivo:</span> {reason}
    </blockquote>
  )
}
