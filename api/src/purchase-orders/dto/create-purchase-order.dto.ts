import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { trim } from '../../common/transforms.js';
import { PurchaseOrderItemDto } from './purchase-order-item.dto.js';

// The requester is not in the body: it is the logged-in user (session cookie).
export class CreatePurchaseOrderDto {
  @IsUUID()
  siteId: string;

  @IsUUID()
  supplierId: string;

  /**
   * Calendar date without time.
   * @example "2026-10-26"
   */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'orderDate must be YYYY-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'orderDate must be a valid date' })
  orderDate: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];
}
