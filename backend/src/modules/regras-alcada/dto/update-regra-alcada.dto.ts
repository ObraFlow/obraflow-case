import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { AprovadorRegraDto } from './create-regra-alcada.dto';

export class UpdateRegraAlcadaDto {
  @ApiPropertyOptional({
    description: 'Descrição amigável da faixa',
    example: 'Até R$ 15.000,00',
  })
  @IsString()
  @IsOptional()
  descricao?: string;

  @ApiPropertyOptional({ description: 'Valor mínimo da faixa (R$)', example: 0 })
  @IsNumber()
  @Min(0, { message: 'O valor mínimo não pode ser negativo' })
  @IsOptional()
  valorMinimo?: number;

  @ApiPropertyOptional({
    description: 'Valor máximo da faixa (R$) - Opcional se for sem limite superior',
    example: 15000,
  })
  @IsNumber()
  @IsOptional()
  valorMaximo?: number;

  @ApiPropertyOptional({
    description: 'Lista ordenada de aprovadores da alçada',
    type: [AprovadorRegraDto],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'A regra deve possuir pelo menos 1 aprovador' })
  @ValidateNested({ each: true })
  @Type(() => AprovadorRegraDto)
  @IsOptional()
  aprovadores?: AprovadorRegraDto[];
}
