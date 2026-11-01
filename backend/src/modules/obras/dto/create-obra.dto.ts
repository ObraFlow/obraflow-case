import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateObraDto {
  @ApiProperty({ description: 'Nome da obra', example: 'Residencial Horizonte Azul' })
  @IsString()
  @IsNotEmpty({ message: 'O nome da obra é obrigatório' })
  nome: string;

  @ApiPropertyOptional({ description: 'Endereço da obra', example: 'Av. Paulista, 1000 - São Paulo, SP' })
  @IsString()
  @IsOptional()
  endereco?: string;
}
