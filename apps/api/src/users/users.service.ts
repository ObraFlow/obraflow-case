import { Injectable } from '@nestjs/common';
import { AppException } from '../common/errors/app.exception.js';
import { isUniqueViolation } from '../common/errors/prisma-errors.js';
import { PrismaService } from '../common/prisma/prisma.service.js';
import type { CreateUserDto } from './create-user.dto.js';
import { toUserResponse } from './user.mapper.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const users = await this.prisma.user.findMany({ orderBy: { name: 'asc' } });
    return { data: users.map(toUserResponse) };
  }

  async create(dto: CreateUserDto) {
    // A unicidade do e-mail é garantida pelo índice único do banco (sem corrida entre "checar" e "inserir").
    try {
      return toUserResponse(await this.prisma.user.create({ data: dto }));
    } catch (error) {
      if (isUniqueViolation(error, 'email')) {
        throw AppException.conflict(
          'DUPLICATE_EMAIL',
          'Já existe um usuário com este e-mail.',
        );
      }
      throw error;
    }
  }
}
