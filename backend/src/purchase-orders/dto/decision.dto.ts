import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ApproveDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe o aprovador (actingUserId).' })
  actingUserId!: string;
}

export class RejectDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe o aprovador (actingUserId).' })
  actingUserId!: string;

  @IsString()
  @IsNotEmpty({ message: 'A rejeição exige um motivo.' })
  reason!: string;
}

export class ListPurchaseOrdersQueryDto {
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'], { message: 'Situação inválida.' })
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';

  /** Filtra pedidos pendentes cujo nível atual é deste aprovador. */
  @IsOptional()
  @IsString()
  currentApproverId?: string;
}
