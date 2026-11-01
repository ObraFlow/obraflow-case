import { ApprovalRule, ApprovalRuleApprover } from './approval-rule.entity';

const createdAt = new Date('2026-01-01');

const makeRule = (
  minimumTotalCents: number,
  maximumTotalCents: number | null,
  approvers?: ApprovalRuleApprover[],
) =>
  ApprovalRule.create({
    id: 1,
    workId: 2,
    minimumTotalCents,
    maximumTotalCents,
    createdAt,
    approvers,
  });

describe('ApprovalRule', () => {
  describe('create', () => {
    it('mapeia todos os campos, incluindo aprovadores', () => {
      const approvers: ApprovalRuleApprover[] = [
        { id: 1, ruleId: 1, userId: 5, userName: 'Ana', position: 1 },
      ];

      const rule = makeRule(100, 200, approvers);

      expect(rule.id).toBe(1);
      expect(rule.workId).toBe(2);
      expect(rule.minimumTotalCents).toBe(100);
      expect(rule.maximumTotalCents).toBe(200);
      expect(rule.createdAt).toBe(createdAt);
      expect(rule.approvers).toBe(approvers);
    });

    it('deixa approvers indefinido quando não informado', () => {
      expect(makeRule(100, null).approvers).toBeUndefined();
    });
  });

  describe('nonRelationalData', () => {
    it('retorna apenas os dados não relacionais', () => {
      const rule = makeRule(100, null, [
        { id: 1, ruleId: 1, userId: 5, userName: 'Ana', position: 1 },
      ]);

      expect(rule.nonRelationalData).toEqual({
        id: 1,
        workId: 2,
        minimumTotalCents: 100,
        maximumTotalCents: null,
        createdAt,
      });
    });
  });

  describe('appliesTo', () => {
    describe('com máximo definido', () => {
      const rule = makeRule(100, 200);

      it('não se aplica abaixo do mínimo', () => {
        expect(rule.appliesTo(99)).toBe(false);
      });

      it('se aplica exatamente no mínimo', () => {
        expect(rule.appliesTo(100)).toBe(true);
      });

      it('se aplica dentro da faixa', () => {
        expect(rule.appliesTo(150)).toBe(true);
      });

      it('se aplica exatamente no máximo', () => {
        expect(rule.appliesTo(200)).toBe(true);
      });

      it('não se aplica acima do máximo', () => {
        expect(rule.appliesTo(201)).toBe(false);
      });
    });

    describe('sem máximo (null)', () => {
      const rule = makeRule(100, null);

      it('não se aplica abaixo do mínimo', () => {
        expect(rule.appliesTo(99)).toBe(false);
      });

      it('se aplica em qualquer valor a partir do mínimo', () => {
        expect(rule.appliesTo(100)).toBe(true);
        expect(rule.appliesTo(Number.MAX_SAFE_INTEGER)).toBe(true);
      });
    });
  });
});
