import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiResponse } from '../../../../shared/types/index';

export class CreateWorkDto {
  @ApiProperty({
    description: 'O nome da obra',
    example: 'Obra Exemplo',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 180)
  name!: string;
}

export class CreateWorkResponseDataDto {
  @ApiProperty({
    description: 'O ID da obra criada',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: 'O nome da obra criada',
    example: 'Obra Exemplo',
  })
  name!: string;
}

export class CreateWorkResponseDto implements ApiResponse {
  @ApiProperty({
    description: 'Indica se a operação foi bem-sucedida',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Dados da obra criada',
    type: CreateWorkResponseDataDto,
  })
  data?: CreateWorkResponseDataDto | null;

  @ApiProperty({
    description: 'Mensagem de sucesso ou erro',
    example: 'Obra criada com sucesso',
  })
  message!: string;

  @ApiProperty({
    description: 'Mensagem de erro, se houver',
    example: 'Erro ao criar obra',
  })
  error?: string;
}
