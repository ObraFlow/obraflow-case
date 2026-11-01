import { Module } from '@nestjs/common';
import { ApprovalRulesController } from './infrastructure/controllers/approval-rules.controller';
import { ApprovalRulesService } from './application/services/approval-rules.service';
import { ApprovalRulesRepositoryImpl } from './infrastructure/repositories/approval-rules.repository.impl';
import { CreateApprovalRuleUseCase } from './application/use-cases/create-approval-rule.use-case';
import { DeleteApprovalRuleUseCase } from './application/use-cases/delete-approval-rule.use-case';
import { ListApprovalRulesUseCase } from './application/use-cases/list-approval-rules.use-case';
import { UpdateApprovalRuleUseCase } from './application/use-cases/update-approval-rule.use-case';
import { APPROVAL_RULES_REPOSITORY } from './domain/repositories/approval-rules.repository';

@Module({
  controllers: [ApprovalRulesController],
  providers: [
    ApprovalRulesService,
    {
      provide: APPROVAL_RULES_REPOSITORY,
      useClass: ApprovalRulesRepositoryImpl,
    },
    CreateApprovalRuleUseCase,
    DeleteApprovalRuleUseCase,
    ListApprovalRulesUseCase,
    UpdateApprovalRuleUseCase,
  ],
})
export class ApprovalRulesModule {}
