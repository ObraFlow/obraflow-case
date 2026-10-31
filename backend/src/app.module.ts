import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { UsersModule } from './users/users.module.js';
import { SuppliersModule } from './suppliers/suppliers.module.js';
import { ApprovalRulesModule } from './approval-rules/approval-rules.module.js';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module.js';

@Module({
  imports: [
    PrismaModule,
    ProjectsModule,
    UsersModule,
    SuppliersModule,
    ApprovalRulesModule,
    PurchaseOrdersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
