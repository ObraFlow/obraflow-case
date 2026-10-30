import {
  applyDecorators,
  HttpStatus,
  type PipeTransform,
} from '@nestjs/common';
import { IsInt, Max, Min, type ValidationOptions } from 'class-validator';
import { AppException } from '../errors/app.exception.js';

/** Maior valor de uma coluna Int (int4) do Postgres. Ids acima disso nem existem no banco. */
export const MAX_ID = 2_147_483_647;

/** Id válido no corpo/query: inteiro entre 1 e MAX_ID. */
export function IsId(message: string, options: ValidationOptions = {}) {
  return applyDecorators(
    Max(MAX_ID, { ...options, message }),
    Min(1, { ...options, message }),
    IsInt({ ...options, message }),
  );
}

/** Id válido na URL (`/purchase-orders/:id`). Substitui o ParseIntPipe, que aceitaria valores fora do int4. */
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const id = Number(value);
    if (!/^\d+$/.test(value) || id < 1 || id > MAX_ID) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Identificador inválido.',
      );
    }
    return id;
  }
}
