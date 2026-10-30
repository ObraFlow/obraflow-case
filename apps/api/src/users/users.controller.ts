import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista os usuários (aprovadores, solicitantes e seletor "Visualizando como")',
  })
  list() {
    return this.users.list();
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra um usuário' })
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }
}
