import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Observable, map } from 'rxjs';

/**
 * O Prisma devolve valores Decimal como objetos. Este interceptor converte
 * recursivamente Decimal -> number nas respostas JSON, para o frontend consumir
 * direto. (Precisão de 2 casas é suficiente para a faixa de valores do case;
 * em produção exporíamos como string para evitar limites do double.)
 */
@Injectable()
export class DecimalInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(map((data) => this.transform(data)));
  }

  private transform(value: unknown): unknown {
    if (value === null || value === undefined) return value;
    if (value instanceof Prisma.Decimal) return value.toNumber();
    if (value instanceof Date) return value;
    if (Array.isArray(value)) return value.map((item) => this.transform(item));
    if (typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(
        value as Record<string, unknown>,
      )) {
        out[key] = this.transform(val);
      }
      return out;
    }
    return value;
  }
}
