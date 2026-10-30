import Decimal from 'decimal.js';
import type { ApprovalRule, Money } from '@/lib/api/types';
import { formatBRL } from '@/lib/format';
import { parseDecimalInput } from '@/lib/money';

// Regras do formulário de faixa (criar/editar). O início de uma faixa não é digitado:
// é o limite da faixa anterior + R$ 0,01 — o mesmo cálculo do backend.

export interface RuleDraft {
  /** Limite digitado ("50.000,00"); ignorado quando `unlimited`. */
  limit: string;
  unlimited: boolean;
  approverIds: number[];
}

export interface DraftErrors {
  limit?: string;
  approverIds?: string;
}

const MAX_MONEY = new Decimal('999999999999.99');

/** Limite no formato da API ("50000.00"), null = sem limite, undefined = inválido. */
export function draftMaxAmount(draft: RuleDraft): Money | null | undefined {
  if (draft.unlimited) return null;
  const parsed = parseDecimalInput(draft.limit, 2);
  if (parsed === null) return undefined;
  const value = new Decimal(parsed);
  if (value.lte(0) || value.gt(MAX_MONEY)) return undefined;
  return value.toFixed(2);
}

/** De onde a faixa começa, considerando as outras faixas da obra (sem a que está sendo editada). */
export function draftFromAmount(
  otherRules: ApprovalRule[],
  maxAmount: Money | null,
): Money {
  const limits = otherRules
    .map((rule) => rule.maxAmount)
    .filter((limit): limit is Money => limit !== null)
    .map((limit) => new Decimal(limit))
    .filter((limit) => maxAmount === null || limit.lt(maxAmount));
  if (limits.length === 0) return '0.00';
  return Decimal.max(...limits)
    .plus('0.01')
    .toFixed(2);
}

/** Validação antes de enviar (a API valida de novo e garante a unicidade no banco). */
export function validateDraft(
  draft: RuleDraft,
  otherRules: ApprovalRule[],
): DraftErrors {
  const errors: DraftErrors = {};
  const maxAmount = draftMaxAmount(draft);

  if (!draft.unlimited) {
    if (draft.limit.trim() === '') {
      errors.limit = 'Informe o limite da faixa ou marque "sem limite".';
    } else if (maxAmount === undefined) {
      errors.limit =
        'Informe um valor maior que zero, com até 2 casas decimais.';
    } else if (otherRules.some((rule) => rule.maxAmount === maxAmount)) {
      errors.limit = `Já existe uma faixa com o limite de ${formatBRL(maxAmount!)} nesta obra.`;
    }
  } else if (otherRules.some((rule) => rule.maxAmount === null)) {
    errors.limit = 'Esta obra já tem uma faixa "sem limite".';
  }

  if (draft.approverIds.length === 0) {
    errors.approverIds = 'Adicione pelo menos 1 aprovador.';
  }
  return errors;
}

/** Move um aprovador de posição (setas ↑↓ e arrastar). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Valor de dinheiro da API → texto do campo ("50000.00" → "50.000,00"). */
export function moneyToInput(value: Money): string {
  const [integer, cents] = new Decimal(value).toFixed(2).split('.');
  return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${cents}`;
}
