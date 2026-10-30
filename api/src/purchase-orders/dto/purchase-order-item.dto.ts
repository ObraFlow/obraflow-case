import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import {
  MONEY_MESSAGE,
  MONEY_REGEX,
  QUANTITY_MESSAGE,
  QUANTITY_REGEX,
} from '../../common/money.js';
import { trim } from '../../common/transforms.js';

// Totals are not accepted from the client: they are always calculated by the API.
export class PurchaseOrderItemDto {
  /** @example "Areia média lavada" */
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description: string;

  /**
   * Up to 3 decimals, greater than zero.
   * @example "12.5"
   */
  @Matches(QUANTITY_REGEX, { message: QUANTITY_MESSAGE })
  quantity: string;

  /**
   * Unit of measure, e.g. un, kg, m, m³, h.
   * @example "m³"
   */
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  unit: string;

  /**
   * Price per unit, up to 2 decimals.
   * @example "145.00"
   */
  @Matches(MONEY_REGEX, { message: MONEY_MESSAGE })
  unitPrice: string;
}
