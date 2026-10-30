import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs';
import { Prisma } from '../generated/prisma/client.js';

/** Response fields that hold money (Decimal(14, 2) columns and derived limits). */
const MONEY_FIELDS = new Set(['total', 'unitPrice', 'maxAmount', 'minAmount']);

/**
 * Prisma serializes Decimal without trailing zeros ("10000", "12.5"). Money
 * fields always go out with two decimals ("10000.00", "12.50"), the same
 * format the API accepts. Quantities keep their natural form ("12.5").
 */
export function formatMoney(value: unknown, key?: string): unknown {
  if (Prisma.Decimal.isDecimal(value)) {
    return key && MONEY_FIELDS.has(key) ? value.toFixed(2) : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatMoney(item));
  }
  // Only plain objects (query results); Dates and other classes pass through.
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value).map(([field, item]) => [
        field,
        formatMoney(item, field),
      ]),
    );
  }
  return value;
}

@Injectable()
export class MoneyFormatInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map((body: unknown) => formatMoney(body)));
  }
}
