import { Check, Clock, Plus, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PurchaseOrderDetail } from '@/lib/api/types';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

// Linha do tempo do drawer: junta o histórico (o que aconteceu, append-only no backend)
// com as etapas que ainda não aconteceram (atual, próximas, ou puladas por rejeição).

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'muted';

interface Entry {
  key: string;
  tone: Tone;
  marker: ReactNode;
  title: string;
  meta: string;
  extra?: ReactNode;
}

const MARKER: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground border-border',
  success: 'bg-success-soft text-success-strong border-success-border',
  warning: 'bg-warning-soft text-warning-strong border-warning',
  danger: 'bg-danger-soft text-danger-strong border-danger-border',
  muted: 'bg-transparent text-muted-foreground/70 border-dashed border-border',
};

const TITLE: Record<Tone, string> = {
  neutral: 'text-foreground',
  success: 'text-success-strong',
  warning: 'text-warning-strong',
  danger: 'text-danger-strong',
  muted: 'text-muted-foreground',
};

function buildEntries(
  order: PurchaseOrderDetail,
  viewerId: number | undefined,
): Entry[] {
  const created = order.history.find((event) => event.type === 'CREATED');
  const entries: Entry[] = [];

  if (created) {
    entries.push({
      key: 'created',
      tone: 'neutral',
      marker: <Plus className="size-3" aria-hidden="true" />,
      title: 'Pedido criado',
      meta: `${created.actor.name} · ${formatDateTime(created.at)}`,
    });
  }

  for (const step of order.steps) {
    const { approver } = step;
    const decision = order.history.find(
      (event) => event.stepPosition === step.position,
    );
    const stepLabel = `${step.position}ª etapa`;

    switch (step.status) {
      case 'APPROVED':
        entries.push({
          key: `step-${step.id}`,
          tone: 'success',
          marker: <Check className="size-3" aria-hidden="true" />,
          title: `Aprovado por ${approver.name}`,
          meta: `${decision ? formatDateTime(decision.at) : ''} · ${approver.jobTitle}`,
        });
        break;
      case 'REJECTED':
        entries.push({
          key: `step-${step.id}`,
          tone: 'danger',
          marker: <X className="size-3" aria-hidden="true" />,
          title: `Rejeitado por ${approver.name}`,
          meta: `${decision ? formatDateTime(decision.at) : ''} · ${approver.jobTitle}`,
          extra: decision?.reason && (
            <div className="mt-2 rounded-md border border-danger-border bg-danger-soft px-3 py-2">
              <p className="text-[11px] font-semibold tracking-wider text-danger-strong uppercase">
                Motivo da rejeição
              </p>
              <p className="mt-0.5 text-sm whitespace-pre-line text-danger-strong">
                {decision.reason}
              </p>
            </div>
          ),
        });
        break;
      case 'PENDING':
        entries.push({
          key: `step-${step.id}`,
          tone: 'warning',
          marker: approver.initials,
          title: `Aguardando ${approver.name}`,
          meta: `${approver.jobTitle} · ${stepLabel}`,
          extra: approver.id === viewerId && (
            <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-warning-strong">
              <Clock className="size-3.5" aria-hidden="true" />
              Aguardando sua decisão
            </p>
          ),
        });
        break;
      case 'WAITING':
        entries.push({
          key: `step-${step.id}`,
          tone: 'neutral',
          marker: approver.initials,
          title: approver.name,
          meta: `${approver.jobTitle} · ${stepLabel} · aguardando a etapa anterior`,
        });
        break;
      case 'SKIPPED':
        entries.push({
          key: `step-${step.id}`,
          tone: 'muted',
          marker: approver.initials,
          title: approver.name,
          meta: `${approver.jobTitle} · não chegou a decidir (pedido rejeitado antes)`,
        });
        break;
    }
  }
  return entries;
}

export function ApprovalTimeline({
  order,
  viewerId,
}: {
  order: PurchaseOrderDetail;
  viewerId: number | undefined;
}) {
  const entries = buildEntries(order, viewerId);

  return (
    <ol className="space-y-0">
      {entries.map((entry, index) => {
        const isLast = index === entries.length - 1;
        return (
          <li key={entry.key} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-8 bottom-1 left-[13px] w-px',
                  entry.tone === 'success' ? 'bg-success-border' : 'bg-border',
                )}
              />
            )}
            <span
              className={cn(
                'relative z-10 grid size-7 shrink-0 place-items-center rounded-full border text-[10px] font-bold',
                MARKER[entry.tone],
              )}
            >
              {entry.marker}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className={cn('text-sm font-semibold', TITLE[entry.tone])}>
                {entry.title}
              </p>
              <p className="text-[13px] text-muted-foreground">{entry.meta}</p>
              {entry.extra}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
