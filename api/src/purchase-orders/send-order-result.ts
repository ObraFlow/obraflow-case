import type { Response } from 'express';
import type { OrderResult } from './purchase-orders.service.js';

/**
 * A retried request gets the same body as the first one. The header tells the
 * client (and whoever reads the logs) that nothing new was written.
 */
export function sendOrderResult(response: Response, result: OrderResult) {
  if (result.replayed) {
    response.setHeader('Idempotent-Replayed', 'true');
  }
  return result.order;
}
