import { Injectable } from '@nestjs/common';
import { ApprovalRulesService } from '../services/approval-rules.service';
import { ListApprovalRulesResponseDataDto } from '../dtos/list-approval-rules.dto';

@Injectable()
export class ListApprovalRulesUseCase {
  constructor(private readonly service: ApprovalRulesService) {}

  async execute(workId: number): Promise<ListApprovalRulesResponseDataDto[]> {
    const approvalRules = await this.service.list(workId);

    return approvalRules.map((approvalRule) => ({
      id: approvalRule.id,
      workId: approvalRule.workId,
      minimumTotalCents: approvalRule.minimumTotalCents,
      maximumTotalCents: approvalRule.maximumTotalCents,
      approvers: (approvalRule.approvers ?? []).map((approver) => ({
        userId: approver.userId,
        userName: approver.userName,
        position: approver.position,
      })),
    }));
  }
}
