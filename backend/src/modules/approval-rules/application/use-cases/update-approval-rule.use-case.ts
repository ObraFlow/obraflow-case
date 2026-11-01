import { Injectable } from '@nestjs/common';
import { SaveApprovalRuleDto } from '../dtos/save-approval-rule.dto';
import { ApprovalRulesService } from '../services/approval-rules.service';
import { SaveApprovalRuleResponseDataDto } from '../dtos/save-approval-rule.dto';

@Injectable()
export class UpdateApprovalRuleUseCase {
  constructor(private readonly service: ApprovalRulesService) {}

  async execute(
    workId: number,
    ruleId: number,
    input: SaveApprovalRuleDto,
  ): Promise<SaveApprovalRuleResponseDataDto | null> {
    const result = this.service.update(workId, ruleId, input);
    return result.then((approvalRule) => {
      if (!approvalRule) {
        return null;
      }
      return {
        id: approvalRule.id,
        minimumTotalCents: approvalRule.minimumTotalCents,
        maximumTotalCents: approvalRule.maximumTotalCents ?? undefined,
        approvers: (approvalRule.approvers ?? []).map((approver) => ({
          userId: approver.userId,
        })),
      };
    });
  }
}
