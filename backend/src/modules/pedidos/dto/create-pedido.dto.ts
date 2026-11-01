import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreatePedidoItemDto } from './create-pedido-item.dto';

export class CreatePedidoDto {
  @ApiProperty({ description: 'ID da obra do pedido', example: 'uuid-obra' })
  @IsString()
  @IsNotEmpty({ message: 'A obra é obrigatória' })
  obraId: string;

  @ApiProperty({ description: 'ID do fornecedor', example: 'uuid-fornecedor' })
  @IsString()
  @IsNotEmpty({ message: 'O fornecedor é obrigatório' })
  fornecedorId: string;

  @ApiProperty({ description: 'Data de emissão do pedido', example: '2026-11-01' })
  @IsDateString({}, { message: 'A data do pedido deve ser uma data válida' })
  @IsNotEmpty({ message: 'A data do pedido é obrigatória' })
  dataPedido: string;

  @ApiPropertyOptional({
    description: 'Observações internas e justificativa',
    example: 'Material urgente para concretagem da laje do 4º pavimento',
  })
  @IsString()
  @IsOptional()
  observacoes?: string;

  @ApiProperty({
    description: 'Lista de itens do pedido (mínimo 1 item)',
    type: [CreatePedidoItemDto],
  })
  @IsArray({ message: 'Os itens devem ser enviados em formato de lista' })
  @ArrayMinSize(1, { message: 'O pedido de compra deve conter pelo menos 1 item' })
  @ValidateNested({ each: true })
  @Type(() => CreatePedidoItemDto)
  itens: CreatePedidoItemDto[];
}
