import { ApiProperty } from '@nestjs/swagger';
import { ApiResponse } from '../../../../shared/types/index';

export class ListSuppliersResponseDataDto {
  @ApiProperty({
    description: 'O ID do fornecedor criado',
    example: '1',
  })
  id!: number;

  @ApiProperty({
    description: 'O nome do fornecedor criado',
    example: 'Fornecedor Exemplo',
  })
  name!: string;

  @ApiProperty({
    description: 'O documento do fornecedor criado (CNPJ ou CPF)',
    example: '123456789',
  })
  document!: string;
}

export class ListSuppliersResponseDto implements ApiResponse {
  @ApiProperty({
    description: 'Indica se a operação foi bem-sucedida',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'A lista de fornecedores cadastrados',
    type: [ListSuppliersResponseDataDto],
  })
  data!: ListSuppliersResponseDataDto[];

  @ApiProperty({
    description: 'Mensagem de retorno da operação',
    example: 'Lista de fornecedores retornada com sucesso.',
  })
  message!: string;
}
