import {
  IsArray,
  IsDateString,
  IsInt,
  IsPositive,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ApiResponse } from '../../../../shared/types/index';

export class ListOrdersResponseDataDto {
  @ApiProperty({
    description: 'ID do pedido',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  id!: number;

  @ApiProperty({
    description: 'Status do pedido',
    example: 'APPROVED',
  })
  @IsString()
  status!: string;

  @ApiProperty({
    description: 'Data do pedido',
    example: '2026-10-30T12:00:00.000Z',
  })
  @IsDateString()
  orderDate!: string;

  @ApiProperty({
    description: 'Valor total do pedido em centavos',
    example: 150000,
  })
  @IsInt()
  @IsPositive()
  totalCents!: number;

  @ApiProperty({
    description: 'Nome da obra associada ao pedido',
    example: 'Obra Centro',
  })
  @IsString()
  work!: string;

  @ApiProperty({
    description: 'Nome do fornecedor associado ao pedido',
    example: 'Fornecedor A',
  })
  @IsString()
  supplier!: string;
}

export class ListOrdersResponseDto implements ApiResponse {
  @ApiProperty({
    description: 'Indica se a operação foi bem-sucedida',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Lista de pedidos',
    type: [ListOrdersResponseDataDto],
  })
  @IsArray()
  data!: ListOrdersResponseDataDto[];

  @ApiProperty({
    description: 'Mensagem de sucesso ou erro da operação',
    example: 'Pedidos listados com sucesso.',
  })
  @IsString()
  message!: string;
}
