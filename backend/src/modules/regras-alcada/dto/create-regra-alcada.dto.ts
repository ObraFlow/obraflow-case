import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class AprovadorRegraDto {
  @ApiProperty({ description: 'ID do usuário aprovador', example: 'uuid-usuario' })
  @IsString()
  @IsNotEmpty({ message: 'O ID do usuário é obrigatório' })
  usuarioId: string;

  @ApiProperty({ description: 'Ordem sequencial de aprovação (1, 2, ...)', example: 1 })
  @IsInt()
  @Min(1)
  ordem: number;
}

export class CreateRegraAlcadaDto {
  @ApiProperty({ description: 'ID da obra', example: 'uuid-obra' })
  @IsString()
  @IsNotEmpty({ message: 'A obra é obrigatória' })
  obraId: string;

  @ApiPropertyOptional({
    description: 'Descrição amigável da faixa',
    example: 'Até R$ 10.000,00',
  })
  @IsString()
  @IsOptional()
  descricao?: string;

  @ApiProperty({ description: 'Valor mínimo da faixa (R$)', example: 0 })
  @IsNumber()
  @Min(0, { message: 'O valor mínimo não pode ser negativo' })
  valorMinimo: number;

  @ApiPropertyOptional({
    description: 'Valor máximo da faixa (R$) - Opcional se for sem limite superior',
    example: 10000,
  })
  @IsNumber()
  @IsOptional()
  valorMaximo?: number;

  @ApiProperty({
    description: 'Lista ordenada de aprovadores da alçada',
    type: [AprovadorRegraDto],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'A regra deve possuir pelo menos 1 aprovador' })
  @ValidateNested({ each: true })
  @Type(() => AprovadorRegraDto)
  aprovadores: AprovadorRegraDto[];
}
