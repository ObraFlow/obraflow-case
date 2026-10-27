import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { PurchaseOrderStatus } from '../../generated/prisma/client.js';

export class ListPurchaseOrdersQueryDto {
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @IsOptional()
  @IsUUID()
  siteId?: string;

  /** Only orders whose current step is waiting for this user. */
  @IsOptional()
  @IsUUID()
  awaitingApprover?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}
