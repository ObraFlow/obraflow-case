import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RejeitarPedidoDto {
  @ApiProperty({ description: 'ID do usuário aprovador atuante', example: 'uuid-usuario' })
  @IsString()
  @IsNotEmpty({ message: 'O ID do usuário é obrigatório' })
  usuarioId: string;

  @ApiProperty({
    description: 'Motivo obrigatório da rejeição do pedido',
    example: 'Preço unitário do cimento 18% acima da cotação de referência',
  })
  @IsString()
  @IsNotEmpty({ message: 'O motivo da rejeição é obrigatório' })
  @MinLength(5, { message: 'O motivo deve conter ao menos 5 caracteres detalhando a rejeição' })
  motivo: string;
}
