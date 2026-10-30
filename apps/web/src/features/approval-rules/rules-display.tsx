import { ChevronRight } from 'lucide-react';
import { Fragment } from 'react';
import type { ApprovalRule, ApprovalRulesResponse } from '@/lib/api/types';
import { formatBRL } from '@/lib/format';
import { cn } from '@/lib/utils';

// Peças visuais da tela de alçadas: cor de cada faixa, chips de aprovadores e a régua de cobertura.

const BAND_TONES = [
  'bg-success-soft text-success-strong border-success-border',
  'bg-warning-soft text-warning-strong border-warning-border',
  'bg-info-soft text-info-strong border-info-border',
  'bg-muted text-foreground border-border',
];

/** Cor da faixa pela posição (cicla se houver mais faixas que cores). */
export function bandTone(position: number) {
  return BAND_TONES[(position - 1) % BAND_TONES.length];
}

/** Aprovadores em ordem: ① João Ribeiro › ② Amanda Costa */
export function ApproverChips({ rule }: { rule: ApprovalRule }) {
  return (
    <ol
      className="flex flex-wrap items-center gap-1"
      aria-label="Aprovadores na ordem do fluxo"
    >
      {rule.approvers.map(({ position, user }, index) => (
        <Fragment key={user.id}>
          {index > 0 && (
            <ChevronRight
              className="size-3.5 text-muted-foreground"
              aria-hidden="true"
            />
          )}
          <li className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 py-0.5 pr-2.5 pl-0.5 text-[13px] font-medium">
            <span className="grid size-5 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background">
              {position}
            </span>
            {user.name}
          </li>
        </Fragment>
      ))}
    </ol>
  );
}

/** "João R. → Amanda C." (texto curto para a régua). */
function shortChain(rule: ApprovalRule) {
  return rule.approvers
    .map(({ user }) => {
      const [first, ...rest] = user.name.split(' ');
      return rest.length ? `${first} ${rest.at(-1)![0]}.` : first;
    })
    .join(' → ');
}

/**
 * Régua: um segmento por faixa, na ordem dos valores, com os limites embaixo.
 * Segmentos de largura igual (a faixa "sem limite" é infinita: largura proporcional não faria sentido).
 * Sem faixa "sem limite", o trecho final aparece como bloqueado.
 */
export function CoverageRuler({ data }: { data: ApprovalRulesResponse }) {
  const rules = data.data;
  const uncovered = data.coverage.uncoveredFrom;

  return (
    <div className="space-y-2">
      <div className="flex h-16 overflow-hidden rounded-lg border">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center justify-center border-r px-2 text-center last:border-r-0',
              bandTone(rule.position),
            )}
            title={shortChain(rule)}
          >
            <span className="text-[13px] font-semibold">
              Faixa {rule.position}
            </span>
            <span className="w-full truncate text-[11px] opacity-90">
              {shortChain(rule)}
            </span>
          </div>
        ))}
        {uncovered !== null && (
          <div
            className="flex min-w-0 flex-1 flex-col items-center justify-center bg-[repeating-linear-gradient(45deg,var(--danger-soft)_0_8px,transparent_8px_16px)] px-2 text-center text-danger-strong"
            title="Valores sem faixa: pedidos bloqueados"
          >
            <span className="text-[13px] font-semibold">Sem regra</span>
            <span className="w-full truncate text-[11px]">
              pedidos bloqueados
            </span>
          </div>
        )}
      </div>
      {/* Marcas: R$ 0 no início e o limite no fim de cada faixa. */}
      <div className="flex text-[11px] text-muted-foreground tabular-nums">
        {[...rules, ...(uncovered !== null ? [null] : [])].map(
          (rule, index) => (
            <div
              key={rule?.id ?? 'uncovered'}
              className="flex min-w-0 flex-1 justify-between"
            >
              <span>{index === 0 ? 'R$ 0' : ''}</span>
              <span className="truncate">
                {rule === null || rule.maxAmount === null
                  ? '∞'
                  : formatBRL(rule.maxAmount).replace(',00', '')}
              </span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
