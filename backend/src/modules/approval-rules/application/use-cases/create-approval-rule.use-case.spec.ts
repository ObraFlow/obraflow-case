import { SaveApprovalRuleDto } from '../dtos/save-approval-rule.dto';
import { ApprovalRulesService } from '../services/approval-rules.service';
import { ApprovalRule } from '../../domain/entities/approval-rule.entity';
import { CreateApprovalRuleUseCase } from './create-approval-rule.use-case';

const makeRule = (
  overrides: Partial<Parameters<typeof ApprovalRule.create>[0]> = {},
) =>
  ApprovalRule.create({
    id: 1,
    workId: 2,
    minimumTotalCents: 100,
    maximumTotalCents: 200,
    createdAt: new Date('2026-01-01'),
    approvers: [
      { id: 1, ruleId: 1, userId: 5, userName: 'Ana', position: 1 },
      { id: 2, ruleId: 1, userId: 6, userName: 'Beto', position: 2 },
    ],
    ...overrides,
  });

describe('CreateApprovalRuleUseCase', () => {
  let service: { create: jest.Mock };
  let useCase: CreateApprovalRuleUseCase;
  const input = {
    minimumTotalCents: 100,
    maximumTotalCents: 200,
    approvers: [{ userId: 5 }, { userId: 6 }],
  } as SaveApprovalRuleDto;

  beforeEach(() => {
    service = { create: jest.fn() };
    useCase = new CreateApprovalRuleUseCase(
      service as unknown as ApprovalRulesService,
    );
  });

  it('retorna null quando o service retorna null', async () => {
    service.create.mockResolvedValue(null);

    await expect(useCase.execute(2, input)).resolves.toBeNull();
    expect(service.create).toHaveBeenCalledWith(2, input);
  });

  it('mapeia a regra criada para o DTO de resposta', async () => {
    service.create.mockResolvedValue(makeRule());

    await expect(useCase.execute(2, input)).resolves.toEqual({
      id: 1,
      minimumTotalCents: 100,
      maximumTotalCents: 200,
      approvers: [{ userId: 5 }, { userId: 6 }],
    });
  });

  it('converte maximumTotalCents null em undefined', async () => {
    service.create.mockResolvedValue(makeRule({ maximumTotalCents: null }));

    const result = await useCase.execute(2, input);

    expect(result?.maximumTotalCents).toBeUndefined();
  });

  it('usa lista vazia quando approvers é undefined', async () => {
    service.create.mockResolvedValue(makeRule({ approvers: undefined }));

    const result = await useCase.execute(2, input);

    expect(result?.approvers).toEqual([]);
  });

  it('propaga o erro do service', async () => {
    const error = new Error('falhou');
    service.create.mockRejectedValue(error);

    await expect(useCase.execute(2, input)).rejects.toBe(error);
  });
});
