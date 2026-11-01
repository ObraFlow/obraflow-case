import { Module } from '@nestjs/common';
import { SuppliersService } from './application/services/suppliers.service';
import { CreateSupplierUseCase } from './application/use-cases/create-supplier.use-case';
import { ListSuppliersUseCase } from './application/use-cases/list-suppliers.use-case';
import { SUPPLIERS_REPOSITORY } from './domain/repositories/suppliers.repository';
import { SuppliersController } from './infrastructure/controllers/suppliers.controller';
import { SuppliersRepositoryImpl } from './infrastructure/repositories/suppliers.repository.impl';

@Module({
  controllers: [SuppliersController],
  providers: [
    SuppliersService,
    {
      provide: SUPPLIERS_REPOSITORY,
      useClass: SuppliersRepositoryImpl,
    },
    CreateSupplierUseCase,
    ListSuppliersUseCase,
  ],
})
export class SuppliersModule {}
