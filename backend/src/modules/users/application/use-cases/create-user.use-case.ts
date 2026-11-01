import { Injectable } from '@nestjs/common';
import {
  CreateUserDto,
  CreateUserResponseDataDto,
} from '../dtos/create-user.dto';
import { UsersService } from '../services/users.service';

@Injectable()
export class CreateUserUseCase {
  constructor(private readonly service: UsersService) {}

  async execute(
    input: CreateUserDto,
  ): Promise<CreateUserResponseDataDto | null> {
    const createdUser = await this.service.create({
      name: input.name,
      email: input.email,
    });

    if (!createdUser) {
      return null;
    }

    return {
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      createdAt: createdUser.createdAt,
    };
  }
}
