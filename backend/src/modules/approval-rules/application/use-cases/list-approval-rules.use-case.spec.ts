import { ApprovalRulesService } from '../services/approval-rules.service';
import { ApprovalRule } from '../../domain/entities/approval-rule.entity';
import { ListApprovalRulesUseCase } from './list-approval-rules.use-case';

const makeRule = (
  overrides: Partial<Parameters<typeof ApprovalRule.create>[0]> = {},
) =>
  ApprovalRule.create({
    id: 1,
    workId: 2,
    minimumTotalCents: 100,
    maximumTotalCents: 200,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  });

describe('ListApprovalRulesUseCase', () => {
  let service: { list: jest.Mock };
  let useCase: ListApprovalRulesUseCase;

  beforeEach(() => {
    service = { list: jest.fn() };
    useCase = new ListApprovalRulesUseCase(
      service as unknown as ApprovalRulesService,
    );
  });

  it('retorna lista vazia quando não há regras', async () => {
    service.list.mockResolvedValue([]);

    await expect(useCase.execute(2)).resolves.toEqual([]);
    expect(service.list).toHaveBeenCalledWith(2);
  });

  it('mapeia regras e aprovadores para o DTO', async () => {
    service.list.mockResolvedValue([
      makeRule({
        approvers: [
          { id: 1, ruleId: 1, userId: 5, userName: 'Ana', position: 1 },
          { id: 2, ruleId: 1, userId: 6, userName: 'Beto', position: 2 },
        ],
      }),
    ]);

    await expect(useCase.execute(2)).resolves.toEqual([
      {
        id: 1,
        workId: 2,
        minimumTotalCents: 100,
        maximumTotalCents: 200,
        approvers: [
          { userId: 5, userName: 'Ana', position: 1 },
          { userId: 6, userName: 'Beto', position: 2 },
        ],
      },
    ]);
  });

  it('mantém maximumTotalCents null sem converter', async () => {
    service.list.mockResolvedValue([makeRule({ maximumTotalCents: null })]);

    const [result] = await useCase.execute(2);

    expect(result).toHaveProperty('maximumTotalCents', null);
  });

  it('usa lista vazia quando approvers é undefined', async () => {
    service.list.mockResolvedValue([makeRule({ approvers: undefined })]);

    const [result] = await useCase.execute(2);

    expect(result).toHaveProperty('approvers', []);
  });
});
