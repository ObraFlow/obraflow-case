import { Inject, Injectable } from '@nestjs/common';
import {
  USERS_REPOSITORY,
  UsersRepository,
  CreateUserData,
} from '../../domain/repositories/users.repository';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly repository: UsersRepository,
  ) {}

  list(): Promise<User[]> {
    return this.repository.list();
  }

  create(data: CreateUserData): Promise<User | null> {
    return this.repository.create(data);
  }
}
