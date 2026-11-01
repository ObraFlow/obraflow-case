import { ApiResponse } from '../../../../shared/types/index';
import { ApiProperty } from '@nestjs/swagger';

export class ListUsersResponseDataDto {
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

export class ListUsersResponseDto implements ApiResponse {
  @ApiProperty({
    description: 'Indica se a operação foi bem-sucedida',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Lista de usuários',
    type: [ListUsersResponseDataDto],
  })
  data?: ListUsersResponseDataDto[] | null;

  @ApiProperty({
    description: 'Mensagem de sucesso ou erro',
    example: 'Usuários listados com sucesso',
  })
  message!: string;
}
