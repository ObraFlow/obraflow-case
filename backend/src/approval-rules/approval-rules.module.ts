import { Module } from '@nestjs/common';
import { ApprovalRulesController } from './approval-rules.controller.js';
import { ApprovalRulesService } from './approval-rules.service.js';

@Module({
  controllers: [ApprovalRulesController],
  providers: [ApprovalRulesService],
})
export class ApprovalRulesModule {}
