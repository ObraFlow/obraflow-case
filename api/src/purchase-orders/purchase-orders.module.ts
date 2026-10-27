import { Module } from '@nestjs/common';
import { ApprovalTiersModule } from '../approval-tiers/approval-tiers.module.js';
import { PurchaseOrdersController } from './purchase-orders.controller.js';
import { PurchaseOrdersService } from './purchase-orders.service.js';

@Module({
  imports: [ApprovalTiersModule],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
