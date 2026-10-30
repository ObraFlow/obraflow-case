import { Prisma } from '../../../prisma/generated/client.js';

/** Violação de índice único (P2002). Opcionalmente, só se envolver a coluna informada. */
export function isUniqueViolation(error: unknown, column?: string): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002'
  ) {
    return false;
  }
  if (!column) return true;
  return JSON.stringify(error.meta ?? {}).includes(column);
}
