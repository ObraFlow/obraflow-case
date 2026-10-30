'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ApprovalRule } from '@/lib/api/types';
import { formatBRL, formatRange } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ApproverChips, bandTone } from './rules-display';

interface RulesTableProps {
  rules: ApprovalRule[];
  onCreate: () => void;
  onEdit: (rule: ApprovalRule) => void;
  onRemove: (rule: ApprovalRule) => void;
}

function rangeDetail(rule: ApprovalRule) {
  return rule.maxAmount === null
    ? 'Sem limite superior'
    : `${formatBRL(rule.fromAmount)} — ${formatBRL(rule.maxAmount)}`;
}

/** Faixas da obra, ordenadas por valor. Tabela no desktop, cards no celular. */
export function RulesTable({
  rules,
  onCreate,
  onEdit,
  onRemove,
}: RulesTableProps) {
  return (
    <div>
      {/* Desktop */}
      <table className="hidden w-full text-sm md:table">
        <thead>
          <tr className="border-b bg-muted/40 text-[11px] tracking-wider text-muted-foreground uppercase">
            <th className="w-14 py-2.5 pl-5 text-left font-semibold">#</th>
            <th className="py-2.5 text-left font-semibold">Faixa de valor</th>
            <th className="py-2.5 text-left font-semibold">
              Fluxo de aprovação
            </th>
            <th className="py-2.5 pr-5 text-right font-semibold">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr key={rule.id} className="border-b">
              <td className="py-3.5 pl-5">
                <span
                  className={cn(
                    'grid size-7 place-items-center rounded-full border text-xs font-bold',
                    bandTone(rule.position),
                  )}
                >
                  {rule.position}
                </span>
              </td>
              <td className="py-3.5 pr-4">
                <p className="font-semibold">
                  {formatRange(rule.fromAmount, rule.maxAmount)}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {rangeDetail(rule)}
                </p>
              </td>
              <td className="py-3.5 pr-4">
                <ApproverChips rule={rule} />
              </td>
              <td className="py-3.5 pr-5">
                <RuleActions rule={rule} onEdit={onEdit} onRemove={onRemove} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Celular */}
      <ul className="divide-y md:hidden">
        {rules.map((rule) => (
          <li key={rule.id} className="space-y-3 p-4">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full border text-xs font-bold',
                  bandTone(rule.position),
                )}
              >
                {rule.position}
              </span>
              <div className="min-w-0">
                <p className="font-semibold">
                  {formatRange(rule.fromAmount, rule.maxAmount)}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {rangeDetail(rule)}
                </p>
              </div>
            </div>
            <ApproverChips rule={rule} />
            <RuleActions rule={rule} onEdit={onEdit} onRemove={onRemove} />
          </li>
        ))}
      </ul>

      <div className="p-4">
        <button
          type="button"
          onClick={onCreate}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Plus className="size-4" aria-hidden="true" />
          Nova faixa
        </button>
      </div>
    </div>
  );
}

function RuleActions({
  rule,
  onEdit,
  onRemove,
}: {
  rule: ApprovalRule;
  onEdit: (rule: ApprovalRule) => void;
  onRemove: (rule: ApprovalRule) => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit(rule)}
        aria-label={`Editar faixa ${rule.position}`}
      >
        <Pencil aria-hidden="true" />
        Editar
      </Button>
      <Button
        variant="reject"
        size="sm"
        onClick={() => onRemove(rule)}
        aria-label={`Remover faixa ${rule.position}`}
      >
        <Trash2 aria-hidden="true" />
        Remover
      </Button>
    </div>
  );
}
