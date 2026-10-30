'use client';

import {
  CircleCheck,
  FlaskConical,
  ListChecks,
  TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useResolveRule } from '@/lib/api/queries';
import type { ApprovalRulesResponse } from '@/lib/api/types';
import { formatBRL, formatRange } from '@/lib/format';
import { parseDecimalInput } from '@/lib/money';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { cn } from '@/lib/utils';
import { ApproverChips, bandTone } from './rules-display';

function Card({
  icon: Icon,
  title,
  aside,
  children,
}: {
  icon: typeof ListChecks;
  title: string;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card">
      <header className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
          {title}
        </h2>
        {aside && (
          <span className="text-xs text-muted-foreground">{aside}</span>
        )}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

/** "Testar valor": qual faixa e cadeia seriam aplicadas — mesma função da criação de pedidos. */
export function TestValueCard({ projectId }: { projectId: number }) {
  const [text, setText] = useState('23.000,00');
  const amount = parseDecimalInput(text, 2) ?? undefined;
  const debounced = useDebouncedValue(amount, 300);
  const resolve = useResolveRule(projectId, debounced);

  return (
    <Card
      icon={FlaskConical}
      title="Testar valor"
      aside="Simule qual faixa seria aplicada"
    >
      <div className="space-y-3">
        <div className="relative max-w-56">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
            R$
          </span>
          <Input
            inputMode="decimal"
            aria-label="Valor do pedido para testar"
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="pl-9 tabular-nums"
            aria-invalid={
              text.trim() !== '' && amount === undefined ? true : undefined
            }
          />
        </div>
        <div aria-live="polite">
          {text.trim() !== '' && amount === undefined ? (
            <p className="text-sm text-danger">
              Digite um valor válido, ex.: 23.000,00
            </p>
          ) : !resolve.data ? (
            <Skeleton className="h-16 w-full" />
          ) : resolve.data.matched ? (
            <div
              className={cn(
                'space-y-2 rounded-lg border p-3',
                bandTone(resolve.data.rule.position),
              )}
            >
              <p className="text-sm">
                <strong>{formatBRL(resolve.data.amount)}</strong> se enquadra na{' '}
                <strong>faixa {resolve.data.rule.position}</strong> (
                {formatRange(
                  resolve.data.rule.fromAmount,
                  resolve.data.rule.maxAmount,
                )}
                ).
              </p>
              <ApproverChips rule={resolve.data.rule} />
            </div>
          ) : (
            <div className="flex gap-2 rounded-lg border border-danger-border bg-danger-soft p-3 text-sm text-danger-strong">
              <TriangleAlert
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <p>
                {resolve.data.message} Um pedido com este valor seria bloqueado.
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/** Resumo da configuração da obra. */
export function RulesSummaryCard({
  data,
  projectName,
}: {
  data: ApprovalRulesResponse;
  projectName: string;
}) {
  const uniqueApprovers = new Set(
    data.data.flatMap((rule) =>
      rule.approvers.map((approver) => approver.user.id),
    ),
  ).size;
  const { status, uncoveredFrom } = data.coverage;

  return (
    <Card icon={ListChecks} title="Resumo" aside={projectName}>
      <dl className="space-y-3 text-sm">
        <Row label="Total de faixas">{data.data.length}</Row>
        <Row label="Cobertura">
          {status === 'FULL' ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-success-soft px-2 py-0.5 text-xs font-medium text-success-strong">
              <CircleCheck className="size-3.5" aria-hidden="true" />
              Total · R$ 0 até ∞
            </span>
          ) : (
            <span className="rounded-md bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger-strong">
              {status === 'NONE'
                ? 'Nenhuma'
                : `Parcial · até ${formatBRL(data.data.at(-1)!.maxAmount!)}`}
            </span>
          )}
        </Row>
        <Row label="Aprovadores únicos">{uniqueApprovers}</Row>
        <Row label="Status">
          <span
            className={cn(
              'rounded-md px-2 py-0.5 text-xs font-medium',
              status === 'FULL'
                ? 'bg-success-soft text-success-strong'
                : 'bg-warning-soft text-warning-strong',
            )}
          >
            {status === 'FULL' ? 'Configurado' : 'Incompleto'}
          </span>
        </Row>
      </dl>
      {uncoveredFrom !== null && status === 'PARTIAL' && (
        <p className="mt-4 text-xs text-muted-foreground">
          Pedidos a partir de {formatBRL(uncoveredFrom)} serão bloqueados. Crie
          uma faixa “sem limite” para cobrir esses valores.
        </p>
      )}
    </Card>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{children}</dd>
    </div>
  );
}
