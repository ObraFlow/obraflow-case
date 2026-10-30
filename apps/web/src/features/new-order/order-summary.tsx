'use client';

import { ArrowRight, Loader2, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { ResolveRuleResponse } from '@/lib/api/types';
import { formatBRL, formatRange } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PendingIssue } from './order-form-schema';

export interface ChainPreview {
  /** Prévia indisponível e por quê (sem obra, itens inválidos). */
  hint?: string;
  isLoading: boolean;
  isError: boolean;
  data: ResolveRuleResponse | undefined;
  projectId: number | undefined;
}

interface OrderSummaryProps {
  total: string | null;
  itemCount: number;
  projectName: string | undefined;
  chain: ChainPreview;
  issues: PendingIssue[];
  onIssueClick: (field?: string) => void;
  isSubmitting: boolean;
}

/** Painel lateral (desktop): total, cadeia prevista e o botão com a lista de pendências. */
export function OrderSummary({
  total,
  itemCount,
  projectName,
  chain,
  issues,
  onIssueClick,
  isSubmitting,
}: OrderSummaryProps) {
  return (
    <section
      aria-labelledby="summary-title"
      className="rounded-xl border bg-card lg:sticky lg:top-20"
    >
      <header className="border-b px-5 py-3.5">
        <h2 id="summary-title" className="text-sm font-semibold">
          Resumo do pedido
        </h2>
      </header>
      <div className="space-y-5 p-5">
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Total do pedido
          </p>
          <p
            aria-live="polite"
            className={cn(
              'mt-1 text-3xl font-bold tracking-tight tabular-nums',
              total === null && 'text-muted-foreground',
            )}
          >
            {total === null ? '—' : formatBRL(total)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {total === null
              ? 'Preencha quantidade e preço de todos os itens para calcular'
              : `${itemCount} ${itemCount === 1 ? 'item' : 'itens'}${projectName ? ` · ${projectName}` : ''}`}
          </p>
        </div>

        <div className="border-t pt-5">
          <p className="mb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Cadeia de aprovação
          </p>
          <ChainPreviewContent chain={chain} />
        </div>

        <div className="border-t pt-5">
          <SubmitButton issues={issues} isSubmitting={isSubmitting} />
          <IssuesList issues={issues} onIssueClick={onIssueClick} />
        </div>
      </div>
    </section>
  );
}

/** Barra fixa no rodapé (celular/tablet): total, cadeia resumida e botão. */
export function OrderSummaryBar({
  total,
  itemCount,
  chain,
  issues,
  onIssueClick,
  isSubmitting,
}: OrderSummaryProps) {
  const rule = chain.data?.matched ? chain.data.rule : undefined;
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 space-y-2 border-t bg-card/95 p-4 shadow-[0_-4px_16px_rgb(0_0_0/0.08)] backdrop-blur lg:hidden">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          Total · {itemCount} {itemCount === 1 ? 'item' : 'itens'}
        </span>
        <span className="text-xl font-bold tabular-nums">
          {total === null ? '—' : formatBRL(total)}
        </span>
      </div>
      {rule && (
        <p className="truncate text-xs text-muted-foreground">
          {rule.approvers.map((a) => a.user.name).join(' → ')}
        </p>
      )}
      {chain.data && !chain.data.matched && (
        <p className="text-xs font-medium text-warning-strong">
          Sem faixa de alçada para este valor
        </p>
      )}
      <SubmitButton issues={issues} isSubmitting={isSubmitting} />
      {issues.length > 0 && (
        <button
          type="button"
          onClick={() => onIssueClick(issues[0].field)}
          className="block w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Falta: {issues[0].message}
          {issues.length > 1 && ` (+${issues.length - 1})`}
        </button>
      )}
    </div>
  );
}

function SubmitButton({
  issues,
  isSubmitting,
}: {
  issues: PendingIssue[];
  isSubmitting: boolean;
}) {
  return (
    <Button
      type="submit"
      size="lg"
      className="h-10 w-full text-sm font-semibold"
      disabled={issues.length > 0 || isSubmitting}
      aria-describedby={issues.length > 0 ? 'order-issues' : undefined}
    >
      {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
      {isSubmitting ? 'Cadastrando…' : 'Cadastrar pedido'}
    </Button>
  );
}

const MAX_VISIBLE_ISSUES = 5;

function IssuesList({
  issues,
  onIssueClick,
}: {
  issues: PendingIssue[];
  onIssueClick: (field?: string) => void;
}) {
  if (issues.length === 0) return null;
  const hidden = issues.length - MAX_VISIBLE_ISSUES;
  return (
    <div id="order-issues" className="mt-3">
      <p className="text-xs font-medium text-muted-foreground">
        Para cadastrar, falta:
      </p>
      <ul className="mt-1.5 space-y-1">
        {issues.slice(0, MAX_VISIBLE_ISSUES).map((issue) => (
          <li key={issue.message} className="flex gap-1.5 text-xs">
            <span className="text-danger" aria-hidden="true">
              •
            </span>
            {/* Clicar mostra o erro no campo e leva o foco até ele. */}
            <button
              type="button"
              onClick={() => onIssueClick(issue.field)}
              className="text-left text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:underline focus-visible:outline-none"
            >
              {issue.message}
            </button>
          </li>
        ))}
        {hidden > 0 && (
          <li className="text-xs text-muted-foreground">e mais {hidden}…</li>
        )}
      </ul>
    </div>
  );
}

function ChainPreviewContent({ chain }: { chain: ChainPreview }) {
  if (chain.hint) {
    return <p className="text-sm text-muted-foreground italic">{chain.hint}</p>;
  }
  if (chain.isError) {
    return (
      <p className="text-sm text-muted-foreground">
        Não foi possível calcular a cadeia agora. Ela será definida ao
        cadastrar.
      </p>
    );
  }
  if (chain.isLoading || !chain.data) {
    return (
      <div className="space-y-2" aria-label="Calculando cadeia">
        <Skeleton className="h-5 w-44 rounded-md" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }
  if (!chain.data.matched) {
    return (
      <div
        role="alert"
        className="flex gap-2.5 rounded-lg border border-warning-border bg-warning-soft p-3 text-sm text-warning-strong"
      >
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-semibold">Sem regra de alçada</p>
          <p>{chain.data.message} O pedido não pode ser cadastrado.</p>
          {chain.projectId && (
            <Link
              href={`/alcadas?obra=${chain.projectId}`}
              className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
            >
              Configurar alçadas
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    );
  }

  const { rule } = chain.data;
  return (
    <div className="space-y-3">
      <span className="inline-flex rounded-md border border-warning-border bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-strong">
        {formatRange(rule.fromAmount, rule.maxAmount)}
      </span>
      <ol className="space-y-2.5">
        {rule.approvers.map(({ position, user }) => (
          <li key={user.id} className="flex items-center gap-2.5">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              {position}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">
                {user.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {user.jobTitle}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
