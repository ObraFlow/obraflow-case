import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsString, Min } from 'class-validator';

export class CreatePedidoItemDto {
  @ApiProperty({ description: 'Descrição do material ou serviço', example: 'Cimento CP II 50kg' })
  @IsString()
  @IsNotEmpty({ message: 'A descrição do item é obrigatória' })
  descricao: string;

  @ApiProperty({ description: 'Quantidade necessária', example: 100 })
  @IsNumber()
  @IsPositive({ message: 'A quantidade deve ser um número positivo maior que zero' })
  quantidade: number;

  @ApiProperty({ description: 'Unidade de medida', example: 'sc' })
  @IsString()
  @IsNotEmpty({ message: 'A unidade de medida é obrigatória' })
  unidade: string;

  @ApiProperty({ description: 'Preço unitário em R$', example: 35.5 })
  @IsNumber()
  @Min(0, { message: 'O preço unitário não pode ser negativo' })
  precoUnitario: number;
}
