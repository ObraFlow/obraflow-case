import { CheckCircle2, ChevronRight, Circle, Clock, MinusCircle, XCircle } from 'lucide-react'
import { Fragment } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { UserAvatar } from '@/components/UserAvatar'
import { firstName, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ChainStep, StepStatus } from '@/types/api'

const stepConfig = {
  APPROVED: { icon: CheckCircle2, label: 'Aprovou', tone: 'text-emerald-700' },
  CURRENT: { icon: Clock, label: 'Aguardando decisão', tone: 'text-amber-700' },
  WAITING: { icon: Circle, label: 'Próxima etapa', tone: 'text-muted-foreground' },
  REJECTED: { icon: XCircle, label: 'Rejeitou', tone: 'text-red-700' },
  CANCELLED: {
    icon: MinusCircle,
    label: 'Cancelada: fluxo interrompido',
    tone: 'text-muted-foreground',
  },
} satisfies Record<StepStatus, unknown>

interface ChainProps {
  steps: Pick<ChainStep, 'position' | 'status' | 'approver'>[]
  className?: string
}

/**
 * One-line chain for lists: done approvers, the current one (highlighted) and
 * the next ones, in order.
 */
export function ApprovalChainInline({ steps, className }: ChainProps) {
  return (
    <ol
      className={cn('flex flex-wrap items-center gap-1', className)}
      aria-label="Cadeia de aprovação"
    >
      {steps.map((step, index) => {
        const { icon: Icon, label, tone } = stepConfig[step.status]
        return (
          <Fragment key={step.position}>
            {index > 0 && (
              <ChevronRight className="size-3 shrink-0 text-muted-foreground/60" aria-hidden />
            )}
            <li>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs',
                      tone,
                      step.status === 'CURRENT' && 'bg-amber-100 font-medium',
                      step.status === 'CANCELLED' && 'line-through',
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" aria-hidden />
                    {firstName(step.approver.name)}
                    <span className="sr-only">: {label}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {step.approver.name} · {label}
                </TooltipContent>
              </Tooltip>
            </li>
          </Fragment>
        )
      })}
    </ol>
  )
}

interface ChainTimelineProps {
  steps: ChainStep[]
}

/** Vertical chain for the details screen, with decision time and rejection reason. */
export function ApprovalChainTimeline({ steps }: ChainTimelineProps) {
  return (
    <ol className="space-y-0">
      {steps.map((step, index) => {
        const { icon: Icon, label, tone } = stepConfig[step.status]
        const last = index === steps.length - 1
        return (
          <li key={step.position} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && (
              <span className="absolute top-9 bottom-1 left-[17px] w-px bg-border" aria-hidden />
            )}
            <div className="relative">
              <UserAvatar
                name={step.approver.name}
                className={cn('size-9', step.status === 'CURRENT' && 'ring-2 ring-amber-400')}
              />
              <span className="absolute -right-1 -bottom-1 rounded-full bg-card">
                <Icon className={cn('size-4', tone)} aria-hidden />
              </span>
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm leading-tight font-medium">
                <span className="mr-1.5 text-muted-foreground">{step.position}.</span>
                {step.approver.name}
              </p>
              {step.approver.role && (
                <p className="text-xs text-muted-foreground">{step.approver.role}</p>
              )}
              <p className={cn('mt-1 text-xs font-medium', tone)}>
                {label}
                {step.decidedAt && (
                  <span className="font-normal text-muted-foreground">
                    {' '}
                    em {formatDateTime(step.decidedAt)}
                  </span>
                )}
              </p>
              {step.reason && (
                <blockquote className="mt-2 rounded-md border-l-2 border-red-300 bg-red-50 px-3 py-2 text-sm text-red-950">
                  {step.reason}
                </blockquote>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
