import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PurchaseOrderStatus } from '../../generated/prisma/client.js';

export const ORDER_SORTS = [
  'date_desc',
  'date_asc',
  'site',
  'supplier',
] as const;
export type OrderSort = (typeof ORDER_SORTS)[number];

export class ListPurchaseOrdersQueryDto {
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @IsOptional()
  @IsUUID()
  siteId?: string;

  /** Only orders whose current step is waiting for the logged-in user. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  awaitingMe?: boolean;

  /**
   * date_desc (default) / date_asc: by order date. site / supplier: by name,
   * A to Z.
   */
  @IsOptional()
  @IsIn(ORDER_SORTS)
  sort: OrderSort = 'date_desc';

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
