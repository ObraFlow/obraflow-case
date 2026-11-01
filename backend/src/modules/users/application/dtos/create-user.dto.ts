import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiResponse } from '../../../../shared/types/index';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nome do usuário',
    example: 'João da Silva',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 180)
  name!: string;

  @ApiProperty({
    description: 'Email do usuário',
    example: 'example@example.com',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 180)
  @IsEmail()
  email!: string;
}

export class CreateUserResponseDataDto {
  @ApiProperty({
    description: 'ID do usuário',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: 'Nome do usuário',
    example: 'João da Silva',
  })
  name!: string;

  @ApiProperty({
    description: 'Email do usuário',
    example: 'exemplo@exemplo.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Data de criação do usuário',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt!: Date;
}

export class CreateUserResponseDto implements ApiResponse {
  @ApiProperty({
    description: 'Indica se a operação foi bem-sucedida',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Dados do usuário criado',
    type: CreateUserResponseDataDto,
  })
  data?: CreateUserResponseDataDto | null;

  @ApiProperty({
    description: 'Mensagem de sucesso ou erro',
    example: 'Usuário criado com sucesso',
  })
  message!: string;

  @ApiProperty({
    description: 'Mensagem de erro, se houver',
    example: 'Erro ao criar usuário',
  })
  error?: string;
}
