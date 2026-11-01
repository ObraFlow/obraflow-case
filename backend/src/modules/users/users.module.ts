import { Module } from '@nestjs/common';
import { UsersService } from './application/services/users.service';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { USERS_REPOSITORY } from './domain/repositories/users.repository';
import { UsersController } from './infrastructure/controllers/users.controller';
import { UsersRepositoryImpl } from './infrastructure/repositories/users.repository.impl';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: USERS_REPOSITORY,
      useClass: UsersRepositoryImpl,
    },
    CreateUserUseCase,
    ListUsersUseCase,
  ],
})
export class UsersModule {}
