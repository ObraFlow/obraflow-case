import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Response } from 'express';
import { Prisma } from '../generated/prisma/client.js';

const errors: Record<string, { status: number; message: string }> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    message: 'Já existe um registro com esse valor.',
  },
  P2003: {
    status: HttpStatus.CONFLICT,
    message: 'Registro relacionado inexistente ou em uso.',
  },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Registro não encontrado.' },
};

/** Maps known Prisma errors to HTTP responses; anything else falls back to Nest's default (500). */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const known = errors[error.code];

    if (!known) {
      return super.catch(error, host);
    }

    const response = host.switchToHttp().getResponse<Response>();
    response.status(known.status).json({
      statusCode: known.status,
      message: known.message,
      code: error.code,
    });
  }
}
