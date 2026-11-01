import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ApiResponse } from '../../../../shared/types/index';

export class DecideOrderDto {
  @ApiProperty({
    description: 'ID do usuário que está tomando a decisão',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  userId!: number;

  @ApiProperty({
    description: 'Motivo da decisão (opcional)',
    example: 'O pedido não atende aos requisitos.',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class DecideOrderResponseDataDto {
  @ApiProperty({
    description: 'ID do pedido que foi decidido',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  orderId!: number;

  @ApiProperty({
    description: 'Status do pedido após a decisão',
    example: 'approved',
  })
  @IsString()
  status!: string;
}

export class DecideOrderResponseDto implements ApiResponse {
  @ApiProperty({
    description: 'Indica se a operação foi bem-sucedida',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Dados da decisão do pedido',
  })
  data!: DecideOrderResponseDataDto;

  @ApiProperty({
    description: 'Mensagem de sucesso ou erro da operação',
    example: 'Pedido aprovado com sucesso.',
  })
  message!: string;
}
