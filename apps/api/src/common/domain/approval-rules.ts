import { type Decimal, ONE_CENT, ZERO } from './money.js';

// Uma faixa guarda só o limite superior (maxAmount; null = sem limite).
// O início de cada faixa é derivado da ordenação: limite da faixa anterior + R$ 0,01,
// e a primeira começa em R$ 0,00. Assim não existem buracos nem sobreposições.

export interface RuleLimit {
  maxAmount: Decimal | null;
}

export type RuleWithRange<T extends RuleLimit> = T & {
  position: number; // 1 = faixa de menor valor
  fromAmount: Decimal;
};

export type CoverageStatus = 'NONE' | 'PARTIAL' | 'FULL';

export interface Coverage {
  status: CoverageStatus;
  /** A partir de qual valor os pedidos ficam sem faixa (null quando FULL). */
  uncoveredFrom: Decimal | null;
}

/** Ordena as faixas por limite (sem limite por último) e calcula o início de cada uma. */
export function withRanges<T extends RuleLimit>(
  rules: T[],
): RuleWithRange<T>[] {
  const sorted = [...rules].sort((a, b) => {
    if (a.maxAmount === null) return 1;
    if (b.maxAmount === null) return -1;
    return a.maxAmount.comparedTo(b.maxAmount);
  });

  let fromAmount = ZERO;
  return sorted.map((rule, index) => {
    const ranged = { ...rule, position: index + 1, fromAmount };
    if (rule.maxAmount !== null) fromAmount = rule.maxAmount.plus(ONE_CENT);
    return ranged;
  });
}

/** Faixa que cobre o valor, ou null se nenhuma cobre (pedido deve ser bloqueado). */
export function resolveRule<T extends RuleLimit>(
  rules: T[],
  amount: Decimal,
): RuleWithRange<T> | null {
  return (
    withRanges(rules).find(
      (rule) => rule.maxAmount === null || amount.lte(rule.maxAmount),
    ) ?? null
  );
}

/** Quanto da escala de valores as faixas da obra cobrem (usado na régua da tela de alçadas). */
export function coverage(rules: RuleLimit[]): Coverage {
  if (rules.length === 0) return { status: 'NONE', uncoveredFrom: ZERO };
  if (rules.some((rule) => rule.maxAmount === null)) {
    return { status: 'FULL', uncoveredFrom: null };
  }
  const highest = withRanges(rules).at(-1)!.maxAmount!;
  return { status: 'PARTIAL', uncoveredFrom: highest.plus(ONE_CENT) };
}
