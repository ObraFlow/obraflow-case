import { describe, expect, it } from 'vitest';
import {
  NoMatchingRangeError,
  resolveChain,
  selectRange,
  type RuleRange,
} from './approval-engine.js';

const ranges: RuleRange[] = [
  { id: 'r1', minValue: 0, maxValue: 10000, approverUserIds: ['joao'] },
  { id: 'r2', minValue: 10000, maxValue: null, approverUserIds: ['joao', 'amanda'] },
];

describe('selectRange', () => {
  it('abaixo do limite → faixa inferior', () => {
    expect(selectRange(ranges, 8000)?.id).toBe('r1');
  });

  it('acima do limite → faixa aberta', () => {
    expect(selectRange(ranges, 12500)?.id).toBe('r2');
  });

  it('no limite exato → faixa de menor teto', () => {
    expect(selectRange(ranges, 10000)?.id).toBe('r1');
  });

  it('sem faixa aplicável → null', () => {
    const gap: RuleRange[] = [
      { id: 'a', minValue: 0, maxValue: 100, approverUserIds: ['x'] },
    ];
    expect(selectRange(gap, 500)).toBeNull();
  });
});

describe('resolveChain', () => {
  it('monta a cadeia ordenada da faixa', () => {
    expect(resolveChain(ranges, 12500)).toEqual([
      { position: 0, userId: 'joao', decision: 'PENDING' },
      { position: 1, userId: 'amanda', decision: 'PENDING' },
    ]);
  });

  it('lança erro quando não há faixa', () => {
    expect(() => resolveChain([], 500)).toThrow(NoMatchingRangeError);
  });
});
