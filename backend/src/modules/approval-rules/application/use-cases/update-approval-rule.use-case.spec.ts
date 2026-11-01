import { SaveApprovalRuleDto } from '../dtos/save-approval-rule.dto';
import { ApprovalRulesService } from '../services/approval-rules.service';
import { ApprovalRule } from '../../domain/entities/approval-rule.entity';
import { UpdateApprovalRuleUseCase } from './update-approval-rule.use-case';

const makeRule = (
  overrides: Partial<Parameters<typeof ApprovalRule.create>[0]> = {},
) =>
  ApprovalRule.create({
    id: 10,
    workId: 2,
    minimumTotalCents: 100,
    maximumTotalCents: 200,
    createdAt: new Date('2026-01-01'),
    approvers: [
      { id: 1, ruleId: 10, userId: 5, userName: 'Ana', position: 1 },
      { id: 2, ruleId: 10, userId: 6, userName: 'Beto', position: 2 },
    ],
    ...overrides,
  });

describe('UpdateApprovalRuleUseCase', () => {
  let service: { update: jest.Mock };
  let useCase: UpdateApprovalRuleUseCase;
  const input = {
    minimumTotalCents: 100,
    maximumTotalCents: 200,
    approvers: [{ userId: 5 }, { userId: 6 }],
  } as SaveApprovalRuleDto;

  beforeEach(() => {
    service = { update: jest.fn() };
    useCase = new UpdateApprovalRuleUseCase(
      service as unknown as ApprovalRulesService,
    );
  });

  it('retorna null quando o service retorna null', async () => {
    service.update.mockResolvedValue(null);

    await expect(useCase.execute(2, 10, input)).resolves.toBeNull();
    expect(service.update).toHaveBeenCalledWith(2, 10, input);
  });

  it('mapeia a regra atualizada para o DTO de resposta', async () => {
    service.update.mockResolvedValue(makeRule());

    await expect(useCase.execute(2, 10, input)).resolves.toEqual({
      id: 10,
      minimumTotalCents: 100,
      maximumTotalCents: 200,
      approvers: [{ userId: 5 }, { userId: 6 }],
    });
  });

  it('converte maximumTotalCents null em undefined', async () => {
    service.update.mockResolvedValue(makeRule({ maximumTotalCents: null }));

    const result = await useCase.execute(2, 10, input);

    expect(result?.maximumTotalCents).toBeUndefined();
  });

  it('usa lista vazia quando approvers é undefined', async () => {
    service.update.mockResolvedValue(makeRule({ approvers: undefined }));

    const result = await useCase.execute(2, 10, input);

    expect(result?.approvers).toEqual([]);
  });

  it('propaga o erro do service', async () => {
    const error = new Error('falhou');
    service.update.mockRejectedValue(error);

    await expect(useCase.execute(2, 10, input)).rejects.toBe(error);
  });
});
