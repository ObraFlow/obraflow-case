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
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description: string;

  @Matches(QUANTITY_REGEX, { message: `quantity ${QUANTITY_MESSAGE}` })
  quantity: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  unit: string;

  @Matches(MONEY_REGEX, { message: `unitPrice ${MONEY_MESSAGE}` })
  unitPrice: string;
}
