import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiResponse } from '../../../../shared/types/index';

export class CreateSupplierDto {
  @ApiProperty({
    description: 'O nome do fornecedor',
    example: 'Fornecedor Exemplo',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'O documento do fornecedor (CNPJ ou CPF)',
    example: '123456789',
  })
  @IsString()
  @IsNotEmpty()
  document!: string;
}

export class CreateSuppliersResponseDataDto {
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

  @ApiProperty({
    description: 'A data de criação do fornecedor',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt!: Date;
}

export class CreateSupplierResponseDto implements ApiResponse {
  @ApiProperty({
    description: 'Indica se a operação foi bem-sucedida',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Os dados do fornecedor criado',
    type: CreateSuppliersResponseDataDto,
  })
  data!: CreateSuppliersResponseDataDto | null;

  @ApiProperty({
    description: 'Mensagem de retorno da operação',
    example: 'Fornecedor criado com sucesso.',
  })
  message!: string;
}
