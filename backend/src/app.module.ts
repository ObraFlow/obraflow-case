import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { ApprovalRulesModule } from './modules/approval-rules/approval-rules.module';
import { OrdersModule } from './modules/orders/orders.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { UsersModule } from './modules/users/users.module';
import { WorksModule } from './modules/works/works.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    SuppliersModule,
    UsersModule,
    WorksModule,
    ApprovalRulesModule,
    OrdersModule,
  ],
})
export class AppModule {}
