import { ApiProperty } from '@nestjs/swagger';
import { ApiResponse } from '../../../../shared/types/index';

export class ListWorksResponseDataDto {
  @ApiProperty({
    description: 'O ID da obra',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: 'O nome da obra',
    example: 'Obra Exemplo',
  })
  name!: string;
}

export class ListWorksResponseDto implements ApiResponse {
  @ApiProperty({
    description: 'Indica se a requisição foi bem sucedida',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Dados da resposta',
    type: [ListWorksResponseDataDto],
  })
  data?: ListWorksResponseDataDto[];

  @ApiProperty({
    description: 'Mensagem de sucesso ou erro',
    example: 'Obras listadas com sucesso',
  })
  message?: string;

  @ApiProperty({
    description: 'Mensagem de erro, caso haja',
    example: 'Erro ao listar obras',
  })
  error?: string;
}
