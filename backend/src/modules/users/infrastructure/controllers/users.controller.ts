import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateUserDto,
  CreateUserResponseDto,
} from '../../application/dtos/create-user.dto';
import { ListUsersResponseDto } from '../../application/dtos/list-users.dto';
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case';
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case';

@ApiTags('Users')
@Controller()
export class UsersController {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
  ) {}

  @Get('users')
  @ApiOperation({
    summary: 'Lista todos os usuários',
    description: 'Retorna a lista de todos os usuários cadastrados no sistema.',
  })
  async list(): Promise<ListUsersResponseDto> {
    const users = this.listUsersUseCase.execute();
    return users.then((data) => ({
      success: true,
      data,
      message: 'Lista de usuários retornada com sucesso.',
    }));
  }

  @Post('users')
  @ApiOperation({
    summary: 'Cria um novo usuário',
    description: 'Cria um novo usuário com base nos dados fornecidos.',
  })
  async create(@Body() dto: CreateUserDto): Promise<CreateUserResponseDto> {
    const user = await this.createUserUseCase.execute(dto);

    if (!user) {
      return {
        success: false,
        data: null,
        message: 'Falha ao criar o usuário.',
      };
    }

    return {
      success: true,
      data: user,
      message: 'Usuário criado com sucesso.',
    };
  }
}
