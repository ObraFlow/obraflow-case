import { Module } from '@nestjs/common';
import { ApprovalTiersModule } from '../approval-tiers/approval-tiers.module.js';
import { OrderDecisionsController } from './order-decisions.controller.js';
import { OrderDecisionsService } from './order-decisions.service.js';
import { PurchaseOrdersController } from './purchase-orders.controller.js';
import { PurchaseOrdersService } from './purchase-orders.service.js';

@Module({
  imports: [ApprovalTiersModule],
  controllers: [PurchaseOrdersController, OrderDecisionsController],
  providers: [PurchaseOrdersService, OrderDecisionsService],
})
export class PurchaseOrdersModule {}
