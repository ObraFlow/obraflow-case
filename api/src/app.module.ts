import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ApprovalTiersModule } from './approval-tiers/approval-tiers.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module.js';
import { SessionModule } from './session/session.module.js';
import { ConstructionSitesModule } from './construction-sites/construction-sites.module.js';
import { SuppliersModule } from './suppliers/suppliers.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ConstructionSitesModule,
    UsersModule,
    SuppliersModule,
    ApprovalTiersModule,
    SessionModule,
    PurchaseOrdersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
