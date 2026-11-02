import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AprovarPedidoDto {
  @ApiProperty({ description: 'ID do usuário aprovador autenticado/atuante', example: 'uuid-usuario' })
  @IsString()
  @IsNotEmpty({ message: 'O ID do usuário aprovador é obrigatório' })
  usuarioId: string;

  @ApiPropertyOptional({ description: 'Observações adicionais na aprovação', example: 'Aprovado conforme cronograma físico-financeiro' })
  @IsString()
  @IsOptional()
  observacao?: string;
}
