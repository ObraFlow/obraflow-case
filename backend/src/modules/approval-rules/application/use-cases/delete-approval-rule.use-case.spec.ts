import { ApprovalRulesService } from '../services/approval-rules.service';
import { DeleteApprovalRuleUseCase } from './delete-approval-rule.use-case';

describe('DeleteApprovalRuleUseCase', () => {
  let service: { remove: jest.Mock };
  let useCase: DeleteApprovalRuleUseCase;

  beforeEach(() => {
    service = { remove: jest.fn() };
    useCase = new DeleteApprovalRuleUseCase(
      service as unknown as ApprovalRulesService,
    );
  });

  it('retorna o resultado de service.remove', async () => {
    service.remove.mockResolvedValue(true);

    await expect(useCase.execute(2, 10)).resolves.toBe(true);
    expect(service.remove).toHaveBeenCalledWith(2, 10);
  });

  it('propaga o erro do service', async () => {
    const error = new Error('não encontrada');
    service.remove.mockRejectedValue(error);

    await expect(useCase.execute(2, 10)).rejects.toBe(error);
  });
});
