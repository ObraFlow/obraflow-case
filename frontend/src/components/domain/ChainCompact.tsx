import { deriveChain } from '@/lib/chain';
import type { PurchaseOrder } from '@/lib/types';
import { ArrowRight, Check, X } from 'lucide-react';
import { Fragment } from 'react';

/** Cadeia compacta (tabela/cards): concluídos → atual → próximos. */
export function ChainCompact({ order }: { order: PurchaseOrder }) {
  const steps = deriveChain(order);
  return (
    <ol className="flex min-w-0 flex-wrap items-center gap-1">
      {steps.map((d, i) => (
        <Fragment key={d.step.id}>
          {i > 0 && <ArrowRight className="size-3 shrink-0 text-subtle-foreground" aria-hidden />}
          {d.state === 'done' && (
            <li className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
              <Check className="size-3 text-success-icon" strokeWidth={2.5} aria-hidden />
              {d.step.user.name}
            </li>
          )}
          {d.state === 'current' && (
            <li className="inline-flex h-5 items-center gap-1.5 rounded-full bg-primary-soft pl-1.5 pr-2 text-xs font-medium text-primary-text">
              <span className="size-1.5 rounded-full bg-primary shadow-focus" aria-hidden />
              {d.step.user.name}
              <span className="font-normal opacity-80">atual</span>
            </li>
          )}
          {d.state === 'next' && <li className="text-xs text-subtle-foreground">{d.step.user.name}</li>}
          {d.state === 'rejected' && (
            <li className="inline-flex items-center gap-0.5 text-xs font-medium text-danger">
              <X className="size-3" aria-hidden />
              {d.step.user.name}
            </li>
          )}
          {d.state === 'skipped' && (
            <li className="text-xs text-subtle-foreground line-through">{d.step.user.name}</li>
          )}
        </Fragment>
      ))}
    </ol>
  );
}
