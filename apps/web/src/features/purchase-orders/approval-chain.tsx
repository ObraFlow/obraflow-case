import { Fragment } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ApprovalStep, StepStatus } from '@/lib/api/types';
import { formatDateTime, STEP_STATUS_LABELS } from '@/lib/format';
import { cn } from '@/lib/utils';

// Coluna "Alçada": um círculo por aprovador, na ordem do fluxo.
// Verde = aprovou · âmbar = etapa atual · cinza = próximas · vermelho = rejeitou · tracejado = não chegou a decidir.

const DOT: Record<StepStatus, string> = {
  APPROVED: 'bg-success-soft text-success-strong border-success-border',
  PENDING:
    'bg-warning-soft text-warning-strong border-warning ring-2 ring-warning-border',
  WAITING: 'bg-muted text-muted-foreground border-border',
  REJECTED: 'bg-danger-soft text-danger-strong border-danger-border',
  SKIPPED:
    'bg-transparent text-muted-foreground/60 border-dashed border-border',
};

const LINE: Record<StepStatus, string> = {
  APPROVED: 'bg-success-border',
  PENDING: 'bg-border',
  WAITING: 'bg-border',
  REJECTED: 'bg-border',
  SKIPPED: 'bg-border',
};

export function ApprovalChain({ steps }: { steps: ApprovalStep[] }) {
  return (
    <ol className="flex items-center" aria-label="Cadeia de aprovação">
      {steps.map((step, index) => (
        <Fragment key={step.id}>
          {index > 0 && (
            <span
              aria-hidden="true"
              className={cn(
                'h-px w-2.5 shrink-0',
                LINE[steps[index - 1].status],
              )}
            />
          )}
          <li>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  tabIndex={0}
                  aria-label={`${step.position}ª etapa: ${step.approver.name} — ${STEP_STATUS_LABELS[step.status]}`}
                  className={cn(
                    'grid size-[22px] cursor-default place-items-center rounded-full border text-[9px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    DOT[step.status],
                  )}
                >
                  {step.approver.initials}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{step.approver.name}</p>
                <p className="opacity-80">
                  {STEP_STATUS_LABELS[step.status]}
                  {step.decidedAt && ` · ${formatDateTime(step.decidedAt)}`}
                </p>
              </TooltipContent>
            </Tooltip>
          </li>
        </Fragment>
      ))}
    </ol>
  );
}
