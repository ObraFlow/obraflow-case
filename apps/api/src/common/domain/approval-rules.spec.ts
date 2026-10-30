import { coverage, resolveRule, withRanges } from './approval-rules.js';
import { Decimal } from './money.js';

const rule = (id: number, maxAmount: string | null) => ({
  id,
  maxAmount: maxAmount === null ? null : new Decimal(maxAmount),
});

// Faixas do Edifício Maré, fora de ordem de propósito.
const MARE = [rule(3, null), rule(1, '10000.00'), rule(2, '50000.00')];

describe('withRanges', () => {
  it('ordena pelo limite (sem limite por último) e calcula o início de cada faixa', () => {
    const ranged = withRanges(MARE);

    expect(ranged.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(ranged.map((r) => r.position)).toEqual([1, 2, 3]);
    expect(ranged.map((r) => r.fromAmount.toFixed(2))).toEqual([
      '0.00',
      '10000.01',
      '50000.01',
    ]);
  });
});

describe('resolveRule', () => {
  const resolve = (amount: string) =>
    resolveRule(MARE, new Decimal(amount))?.id;

  it('total R$ 0,00 cai na primeira faixa', () => {
    expect(resolve('0')).toBe(1);
  });

  it('valor exatamente no limite cai na própria faixa', () => {
    expect(resolve('10000.00')).toBe(1);
    expect(resolve('50000.00')).toBe(2);
  });

  it('1 centavo acima do limite cai na faixa seguinte', () => {
    expect(resolve('10000.01')).toBe(2);
    expect(resolve('50000.01')).toBe(3);
  });

  it('a faixa "sem limite" cobre qualquer valor acima do maior limite', () => {
    expect(resolve('999999999.99')).toBe(3);
  });

  it('sem faixa "sem limite", valor acima do maior limite não tem faixa', () => {
    const rules = [rule(1, '5000.00'), rule(2, '30000.00')];
    expect(resolveRule(rules, new Decimal('30000.00'))?.id).toBe(2);
    expect(resolveRule(rules, new Decimal('30000.01'))).toBeNull();
  });

  it('obra sem faixas não tem faixa para nenhum valor', () => {
    expect(resolveRule([], new Decimal('1'))).toBeNull();
  });
});

describe('coverage', () => {
  it('NONE quando a obra não tem faixas: tudo bloqueado a partir de R$ 0,00', () => {
    const result = coverage([]);
    expect(result.status).toBe('NONE');
    expect(result.uncoveredFrom?.toFixed(2)).toBe('0.00');
  });

  it('PARTIAL sem faixa "sem limite": bloqueado a partir do maior limite + R$ 0,01', () => {
    const result = coverage([rule(1, '30000.00'), rule(2, '5000.00')]);
    expect(result.status).toBe('PARTIAL');
    expect(result.uncoveredFrom?.toFixed(2)).toBe('30000.01');
  });

  it('FULL quando existe faixa "sem limite"', () => {
    expect(coverage(MARE)).toEqual({ status: 'FULL', uncoveredFrom: null });
  });
});
