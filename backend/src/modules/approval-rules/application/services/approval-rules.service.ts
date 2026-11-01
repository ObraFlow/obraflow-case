import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  APPROVAL_RULES_REPOSITORY,
  ApprovalRuleInput,
  ApprovalRulesRepository,
} from '../../domain/repositories/approval-rules.repository';
import { ApprovalRule } from '../../domain/entities/approval-rule.entity';

@Injectable()
export class ApprovalRulesService {
  constructor(
    @Inject(APPROVAL_RULES_REPOSITORY)
    private readonly repository: ApprovalRulesRepository,
  ) {}

  async list(workId: number): Promise<ApprovalRule[]> {
    return this.repository.listByWork(workId);
  }

  async create(
    workId: number,
    input: ApprovalRuleInput,
  ): Promise<ApprovalRule | null> {
    await this.validate(workId, input);
    return this.repository.create(workId, input);
  }

  async update(
    workId: number,
    ruleId: number,
    input: ApprovalRuleInput,
  ): Promise<ApprovalRule | null> {
    await this.validate(workId, input, ruleId);
    const rule = await this.repository.update(workId, ruleId, input);
    if (!rule) throw new NotFoundException('Regra de alçada não encontrada.');
    return rule;
  }

  async remove(workId: number, ruleId: number): Promise<boolean> {
    if (!(await this.repository.remove(workId, ruleId)))
      throw new NotFoundException('Regra de alçada não encontrada.');
    return true;
  }

  private async validate(
    workId: number,
    input: ApprovalRuleInput,
    ignoredRuleId?: number,
  ): Promise<void> {
    if (!input.approvers.length)
      throw new BadRequestException(
        'A regra precisa de ao menos um aprovador.',
      );
    if (
      input.maximumTotalCents !== undefined &&
      input.maximumTotalCents < input.minimumTotalCents
    ) {
      throw new BadRequestException(
        'O limite máximo não pode ser menor que o mínimo.',
      );
    }
    if (!(await this.repository.workExists(workId)))
      throw new NotFoundException('Obra não encontrada.');
    const ids = input.approvers.map(({ userId }) => userId);
    if (new Set(ids).size !== ids.length)
      throw new BadRequestException(
        'Um aprovador não pode aparecer duas vezes na mesma regra.',
      );
    const found = await this.repository.findUserIds(ids);
    if (found.length !== ids.length)
      throw new BadRequestException('Um ou mais aprovadores não existem.');
    const existingRules = await this.repository.listRangesByWork(workId);
    const conflicts = existingRules.some((rule) => {
      if (rule.id === ignoredRuleId) return false;
      const newMaximum = input.maximumTotalCents ?? Number.MAX_SAFE_INTEGER;
      const currentMaximum = rule.maximumTotalCents ?? Number.MAX_SAFE_INTEGER;
      return (
        input.minimumTotalCents <= currentMaximum &&
        rule.minimumTotalCents <= newMaximum
      );
    });
    if (conflicts)
      throw new BadRequestException(
        'Já existe uma regra para esta faixa da obra.',
      );
  }
}
