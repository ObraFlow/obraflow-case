import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ApiResponse } from '../../../../shared/types/index';

export class ListApprovalRulesDto {
  @ApiProperty({
    description: 'ID da obra',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  workId!: number;
}

export class ListApprovalRulesResponseDataDto extends ListApprovalRulesDto {}

export class ListApprovalRulesResponseDto implements ApiResponse {
  @ApiProperty({
    description: 'Indica se a requisição foi bem sucedida',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Dados da lista de regras de aprovação',
    type: [ListApprovalRulesResponseDataDto],
  })
  data!: ListApprovalRulesResponseDataDto[];

  @ApiProperty({
    description: 'Mensagem de sucesso ou erro',
    example: 'Regras de aprovação listadas com sucesso',
  })
  message!: string;
}
