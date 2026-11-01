import { Injectable } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { ListUsersResponseDataDto } from '../dtos/list-users.dto';

@Injectable()
export class ListUsersUseCase {
  constructor(private readonly service: UsersService) {}

  async execute(): Promise<ListUsersResponseDataDto[]> {
    const users = await this.service.list();

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    }));
  }
}
