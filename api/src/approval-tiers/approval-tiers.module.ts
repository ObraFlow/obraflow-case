import { Module } from '@nestjs/common';
import { ApprovalTiersController } from './approval-tiers.controller.js';
import { ApprovalTiersService } from './approval-tiers.service.js';

@Module({
  controllers: [ApprovalTiersController],
  providers: [ApprovalTiersService],
  // Purchase orders use resolve() to build the approval chain.
  exports: [ApprovalTiersService],
})
export class ApprovalTiersModule {}
