import { deriveChain, type StepState } from '@/lib/chain';
import type { PurchaseOrder } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';
import { Check, X } from 'lucide-react';

function Node({ state, level }: { state: StepState; level: number }) {
  const base = 'grid size-[22px] shrink-0 place-items-center rounded-full';
  if (state === 'done') return <span className={cn(base, 'bg-success-muted text-success')}><Check className="size-3" strokeWidth={2.5} /></span>;
  if (state === 'rejected') return <span className={cn(base, 'bg-danger-muted text-danger')}><X className="size-3" /></span>;
  if (state === 'current')
    return <span className={cn(base, 'border-2 border-primary shadow-focus')}><span className="size-2 rounded-full bg-primary" /></span>;
  if (state === 'skipped') return <span className={cn(base, 'bg-muted text-2xs font-semibold text-subtle-foreground')}>{level}</span>;
  return <span className={cn(base, 'border-[1.5px] border-dashed border-border-strong text-2xs font-semibold text-subtle-foreground')}>{level}</span>;
}

export function ChainVertical({ order, actingUserId }: { order: PurchaseOrder; actingUserId: string | null }) {
  const steps = deriveChain(order);
  return (
    <ol>
      {steps.map((d, i) => {
        const isMe = d.step.userId === actingUserId;
        const statusCls =
          d.state === 'done'
            ? 'text-muted-foreground'
            : d.state === 'current'
              ? 'text-primary-text'
              : d.state === 'rejected'
                ? 'text-danger'
                : 'text-subtle-foreground';
        const statusText =
          d.state === 'current'
            ? isMe
              ? 'Aguardando sua decisão'
              : 'Aguardando decisão'
            : d.state === 'done'
              ? `Aprovado · ${d.step.decidedAt ? formatDateTime(d.step.decidedAt) : ''}`
              : d.state === 'rejected'
                ? `Rejeitado · ${d.step.decidedAt ? formatDateTime(d.step.decidedAt) : ''}`
                : d.state === 'skipped'
                  ? 'Não consultado'
                  : 'Aguardando nível anterior';
        return (
          <li key={d.step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Node state={d.state} level={d.level} />
              {i < steps.length - 1 && <span className="my-[3px] min-h-3.5 w-[1.5px] flex-1 bg-border-strong" />}
            </div>
            <div className={cn('min-w-0 flex-1', i < steps.length - 1 ? 'pb-4' : 'pb-0.5')}>
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium">{d.step.user.name}</span>
                {isMe && <span className="text-xs text-subtle-foreground">(você)</span>}
                <span className="text-2xs text-subtle-foreground">· Nível {d.level}</span>
              </div>
              {d.step.user.role && <div className="text-xs text-subtle-foreground">{d.step.user.role}</div>}
              <div className={cn('num mt-0.5 text-xs', statusCls)}>{statusText}</div>
              {d.state === 'rejected' && d.step.reason && (
                <div className="mt-1.5 rounded-md bg-danger-muted px-2.5 py-2 text-xs text-danger">
                  <span className="font-medium">Motivo da rejeição: </span>
                  {d.step.reason}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
