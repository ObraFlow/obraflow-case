import { Injectable } from '@nestjs/common';
import { ApprovalRulesService } from '../services/approval-rules.service';

@Injectable()
export class DeleteApprovalRuleUseCase {
  constructor(private readonly service: ApprovalRulesService) {}

  async execute(workId: number, ruleId: number): Promise<boolean> {
    const result = this.service.remove(workId, ruleId);
    return result.then((deleted) => {
      return deleted;
    });
  }
}
