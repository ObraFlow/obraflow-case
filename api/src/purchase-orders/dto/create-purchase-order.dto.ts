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
import { IsOrderDateInRange } from '../../common/validators.js';
import { PurchaseOrderItemDto } from './purchase-order-item.dto.js';

// The requester is not in the body: it is the logged-in user (session cookie).
export class CreatePurchaseOrderDto {
  @IsUUID()
  siteId: string;

  @IsUUID()
  supplierId: string;

  /**
   * Calendar date without time, from 2000-01-01 up to one year after today.
   * @example "2026-10-26"
   */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'use o formato AAAA-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'data inválida' })
  @IsOrderDateInRange()
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
