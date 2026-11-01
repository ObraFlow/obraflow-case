import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ApiResponse } from '../../../../shared/types/index';

export class ApprovalRuleApproverDto {
  @ApiProperty({
    description: 'ID do usuário aprovador',
    example: 1,
  })
  @IsInt()
  @Min(1)
  userId!: number;
}

export class SaveApprovalRuleDto {
  @ApiProperty({
    description:
      'Mínimo total do pedido em centavos para que a regra seja aplicada',
    example: 1000,
  })
  @IsInt()
  @Min(0)
  minimumTotalCents!: number;

  @ApiProperty({
    description:
      'Máximo total do pedido em centavos para que a regra seja aplicada',
    example: 10000,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maximumTotalCents?: number;

  @ApiProperty({
    description: 'Lista de aprovadores da regra',
    type: [ApprovalRuleApproverDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ApprovalRuleApproverDto)
  approvers!: ApprovalRuleApproverDto[];
}

export class SaveApprovalRuleResponseDataDto {
  @ApiProperty({
    description: 'ID da regra de aprovação',
    example: 1,
  })
  @IsInt()
  @Min(1)
  id!: number;

  @ApiProperty({
    description:
      'Mínimo total do pedido em centavos para que a regra seja aplicada',
    example: 1000,
  })
  @IsInt()
  @Min(0)
  minimumTotalCents!: number;

  @ApiProperty({
    description:
      'Máximo total do pedido em centavos para que a regra seja aplicada',
    example: 10000,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maximumTotalCents?: number;

  @ApiProperty({
    description: 'Lista de aprovadores da regra',
    type: [ApprovalRuleApproverDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ApprovalRuleApproverDto)
  approvers!: ApprovalRuleApproverDto[];
}

export class SaveApprovalRuleResponseDto implements ApiResponse {
  @ApiProperty({
    description: 'Indica se a operação foi bem-sucedida',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Dados da regra de aprovação criada ou atualizada',
    type: SaveApprovalRuleResponseDataDto,
  })
  data!: SaveApprovalRuleResponseDataDto | null;

  @ApiProperty({
    description: 'Mensagem de sucesso ou erro',
    example: 'Regra de aprovação criada com sucesso',
  })
  message?: string;
}
