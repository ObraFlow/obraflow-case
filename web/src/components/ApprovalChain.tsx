import { CheckCircle2, ChevronRight, Circle, Clock, MinusCircle, XCircle } from 'lucide-react'
import { Fragment } from 'react'
import { FlowArrow } from '@/components/FlowArrow'
import { RejectionReason } from '@/components/RejectionReason'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { UserAvatar } from '@/components/UserAvatar'
import { firstName, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ChainStep, StepStatus } from '@/types/api'

/**
 * label: short status shown next to the name. detail: longer text for the
 * list tooltip (null when the step number alone says it all).
 */
const stepConfig = {
  APPROVED: {
    icon: CheckCircle2,
    label: 'Aprovado',
    detail: 'Aprovou',
    tone: 'text-emerald-700',
    tint: 'border-emerald-100 bg-emerald-50/40',
  },
  CURRENT: {
    icon: Clock,
    label: 'Aguardando',
    detail: 'Aguardando decisão',
    tone: 'text-amber-700',
    tint: 'border-amber-200/70 bg-amber-50/50',
  },
  WAITING: {
    icon: Circle,
    label: 'Na fila',
    detail: null,
    tone: 'text-muted-foreground',
    tint: 'bg-card',
  },
  REJECTED: {
    icon: XCircle,
    label: 'Rejeitado',
    detail: 'Rejeitou',
    tone: 'text-red-700',
    tint: 'border-red-100 bg-red-50/40',
  },
  CANCELLED: {
    icon: MinusCircle,
    label: 'Cancelado',
    detail: 'Cancelada: fluxo interrompido',
    tone: 'text-muted-foreground',
    tint: 'bg-card',
  },
} satisfies Record<StepStatus, unknown>

/** Steps that are not happening now: shown greyed out. */
function isInactive(status: StepStatus) {
  return status === 'WAITING' || status === 'CANCELLED'
}

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
        const { icon: Icon, detail, tone } = stepConfig[step.status]
        const description = [`${step.position}ª etapa`, detail].filter(Boolean).join(' · ')
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
                    <span className="sr-only">: {description}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {step.approver.name} · {description}
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

/** Chain for the details screen, with decision time and rejection reason. */
export function ApprovalChainTimeline({ steps }: ChainTimelineProps) {
  return (
    <ol>
      {steps.map((step, index) => {
        const { icon: Icon, label, tone, tint } = stepConfig[step.status]
        const inactive = isInactive(step.status)
        return (
          <li key={step.position}>
            {/* Lines up with the avatar column: p-3 (12px) + half of size-9. */}
            {index > 0 && <FlowArrow className="ml-3 h-6 w-9 pt-1" />}
            <div className={cn('flex gap-3 rounded-lg border p-3', tint)}>
              <UserAvatar
                name={step.approver.name}
                className={cn('size-9', inactive && 'opacity-50 grayscale')}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <p
                    className={cn(
                      'text-sm leading-tight font-medium',
                      inactive && 'text-muted-foreground',
                    )}
                  >
                    <span className="mr-1 font-normal text-muted-foreground">{step.position}.</span>
                    {step.approver.name}
                  </p>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-xs font-medium',
                      tone,
                      inactive && 'opacity-70',
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden />
                    {label}
                  </span>
                </div>
                {step.approver.role && (
                  <p className="text-xs text-muted-foreground">{step.approver.role}</p>
                )}
                {step.decidedAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    em {formatDateTime(step.decidedAt)}
                  </p>
                )}
                {step.reason && <RejectionReason reason={step.reason} className="bg-white/70" />}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
