import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ApiResponse } from '../../../../shared/types/index';

export class CreateOrderItemDto {
  @ApiProperty({
    description: 'Descrição do item do pedido',
    example: 'Cimento Portland',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({
    description: 'Unidade de medida do item do pedido',
    example: 'kg',
  })
  @IsString()
  @IsNotEmpty()
  unit!: string;

  @ApiProperty({
    description: 'Quantidade do item do pedido',
    example: '10',
  })
  @IsString()
  @IsNotEmpty()
  quantity!: string;

  @ApiProperty({
    description: 'Preço unitário do item do pedido em centavos',
    example: 1000,
  })
  @IsInt()
  @Min(0)
  unitPriceCents!: number;
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'ID da obra associada ao pedido',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  workId!: number;

  @ApiProperty({
    description: 'ID do fornecedor associado ao pedido',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  supplierId!: number;

  @ApiProperty({
    description: 'Data do pedido no formato ISO 8601',
    example: '2023-01-01T00:00:00Z',
  })
  @IsDateString()
  orderDate!: string;

  @ApiProperty({
    description: 'Opcional: Notas adicionais sobre o pedido',
    example: 'Notas.',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Lista de itens do pedido',
    type: [CreateOrderItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}

export class CreateOrderResponseDataDto {
  @ApiProperty({
    description: 'ID do pedido criado',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  id!: number;
}

export class CreateOrderResponseDto implements ApiResponse {
  @ApiProperty({
    description: 'Indica se a operação foi bem-sucedida',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Dados do pedido criado',
    type: CreateOrderResponseDataDto,
  })
  data!: CreateOrderResponseDataDto | null;

  @ApiProperty({
    description: 'Mensagem de sucesso',
    example: 'Pedido criado com sucesso.',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;
}
