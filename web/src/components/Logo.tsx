import { cn } from '@/lib/utils'

/** ObraFlow mark: rising bars on the brand blue (same as obraflow.app.br). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={cn('size-8 shrink-0', className)}>
      <rect width="32" height="32" rx="8" fill="var(--brand)" />
      <rect x="6" y="22" width="4.5" height="6" rx="1.5" fill="white" />
      <rect x="13.75" y="16" width="4.5" height="12" rx="1.5" fill="white" />
      <rect x="21.5" y="10" width="4.5" height="18" rx="1.5" fill="white" />
    </svg>
  )
}

/** Mark + wordmark ("Obra" dark, "Flow" in the brand blue). */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <LogoMark className="size-7" />
      <span className="text-[17px] font-extrabold tracking-tight">
        Obra<span className="text-brand">Flow</span>
      </span>
    </span>
  )
}
