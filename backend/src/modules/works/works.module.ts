import { Module } from '@nestjs/common';
import { CreateWorkUseCase } from './application/use-cases/create-work.use-case';
import { ListWorksUseCase } from './application/use-cases/list-works.use-case';
import { WORKS_REPOSITORY } from './domain/repositories/works.repository';
import { WorksController } from './infrastructure/controllers/works.controller';
import { WorksRepositoryImpl } from './infrastructure/repositories/works.repository.impl';
import { WorksService } from './application/services/works.service';

@Module({
  controllers: [WorksController],
  providers: [
    WorksService,
    {
      provide: WORKS_REPOSITORY,
      useClass: WorksRepositoryImpl,
    },
    CreateWorkUseCase,
    ListWorksUseCase,
  ],
})
export class WorksModule {}
