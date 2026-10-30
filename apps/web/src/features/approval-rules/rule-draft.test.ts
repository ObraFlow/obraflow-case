import { describe, expect, it } from 'vitest';
import type { ApprovalRule } from '@/lib/api/types';
import {
  draftFromAmount,
  draftMaxAmount,
  moneyToInput,
  moveItem,
  validateDraft,
} from './rule-draft';

const rule = (id: number, maxAmount: string | null): ApprovalRule => ({
  id,
  position: id,
  fromAmount: '0.00',
  maxAmount,
  approvers: [],
  updatedAt: '2026-10-23T00:00:00.000Z',
});

// Faixas do Edifício Maré.
const MARE = [rule(1, '10000.00'), rule(2, '50000.00'), rule(3, null)];

describe('draftFromAmount (início calculado da faixa)', () => {
  it('começa em R$ 0,00 quando não há faixa abaixo', () => {
    expect(draftFromAmount(MARE, '5000.00')).toBe('0.00');
    expect(draftFromAmount([], null)).toBe('0.00');
  });

  it('começa 1 centavo depois do maior limite abaixo dele', () => {
    expect(draftFromAmount(MARE, '30000.00')).toBe('10000.01');
    expect(draftFromAmount(MARE.slice(0, 2), null)).toBe('50000.01');
  });
});

describe('validateDraft', () => {
  const others = MARE.filter((r) => r.id !== 2); // editando a faixa 2

  it('aceita uma faixa válida', () => {
    expect(
      validateDraft(
        { limit: '30.000,00', unlimited: false, approverIds: [1] },
        others,
      ),
    ).toEqual({});
  });

  it('exige limite (ou "sem limite") e pelo menos 1 aprovador', () => {
    expect(
      validateDraft({ limit: '', unlimited: false, approverIds: [] }, others),
    ).toEqual({
      limit: 'Informe o limite da faixa ou marque "sem limite".',
      approverIds: 'Adicione pelo menos 1 aprovador.',
    });
  });

  it('recusa limite zero, negativo ou inválido', () => {
    for (const limit of ['0', '-5', 'abc', '1,234']) {
      expect(
        validateDraft({ limit, unlimited: false, approverIds: [1] }, others)
          .limit,
      ).toBe('Informe um valor maior que zero, com até 2 casas decimais.');
    }
  });

  it('recusa limite repetido e uma segunda faixa "sem limite"', () => {
    expect(
      validateDraft(
        { limit: '10.000', unlimited: false, approverIds: [1] },
        others,
      ).limit,
    ).toContain('Já existe uma faixa com o limite');
    expect(
      validateDraft({ limit: '', unlimited: true, approverIds: [1] }, others)
        .limit,
    ).toBe('Esta obra já tem uma faixa "sem limite".');
  });
});

describe('utilitários', () => {
  it('converte o limite digitado para a API', () => {
    expect(
      draftMaxAmount({ limit: '50.000', unlimited: false, approverIds: [] }),
    ).toBe('50000.00');
    expect(
      draftMaxAmount({ limit: '', unlimited: true, approverIds: [] }),
    ).toBeNull();
  });

  it('move aprovadores de posição', () => {
    expect(moveItem([1, 2, 3], 2, 0)).toEqual([3, 1, 2]);
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
  });

  it('formata dinheiro da API para o campo', () => {
    expect(moneyToInput('50000.00')).toBe('50.000,00');
    expect(moneyToInput('15000.5')).toBe('15.000,50');
  });
});
