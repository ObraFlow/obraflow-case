import { describe, expect, it } from 'vitest';
import {
  NoMatchingRangeError,
  resolveChain,
  selectRange,
  type RuleRange,
  ApprovalError,
  decide,
  type OrderState,
} from './approval-engine.js';

const ranges: RuleRange[] = [
  { id: 'r1', minValue: 0, maxValue: 10000, approverUserIds: ['joao'] },
  {
    id: 'r2',
    minValue: 10000,
    maxValue: null,
    approverUserIds: ['joao', 'amanda'],
  },
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

const base: OrderState = {
  status: 'PENDING',
  currentStep: 0,
  chain: [
    { position: 0, userId: 'joao', decision: 'PENDING' },
    { position: 1, userId: 'amanda', decision: 'PENDING' },
  ],
};

describe('decide', () => {
  it('aprovar 1º nível avança e mantém PENDING', () => {
    expect(decide(base, 'joao', 'APPROVE')).toEqual({
      stepPosition: 0,
      stepDecision: 'APPROVED',
      newStatus: 'PENDING',
      newCurrentStep: 1,
    });
  });

  it('aprovar último nível conclui (APPROVED)', () => {
    const last = { ...base, currentStep: 1 };
    expect(decide(last, 'amanda', 'APPROVE').newStatus).toBe('APPROVED');
  });

  it('rejeitar interrompe e exige motivo', () => {
    expect(decide(base, 'joao', 'REJECT', 'fora do orçamento').newStatus).toBe(
      'REJECTED',
    );
  });

  it('rejeitar sem motivo → REASON_REQUIRED', () => {
    expect(() => decide(base, 'joao', 'REJECT', '  ')).toThrow(ApprovalError);
  });

  it('não é a vez dele → NOT_CURRENT_APPROVER', () => {
    try {
      decide(base, 'amanda', 'APPROVE');
    } catch (e) {
      expect((e as ApprovalError).code).toBe('NOT_CURRENT_APPROVER');
    }
  });

  it('pedido já concluído → ORDER_NOT_PENDING', () => {
    const done = { ...base, status: 'APPROVED' as const, currentStep: 2 };
    try {
      decide(done, 'amanda', 'APPROVE');
    } catch (e) {
      expect((e as ApprovalError).code).toBe('ORDER_NOT_PENDING');
    }
  });
});
