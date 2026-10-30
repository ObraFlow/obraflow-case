import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../../prisma/generated/client.js';
import {
  AppException,
  type ErrorBody,
  type ErrorCode,
} from './app.exception.js';

// Converte qualquer erro para o formato único do contrato: { statusCode, code, message, details }.
// Erros inesperados viram 500 genérico (detalhes só no log, nunca na resposta).
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);
    if (body.statusCode >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
      );
    }
    response.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof AppException) {
      return exception.getResponse() as ErrorBody;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const body = fromPrismaError(exception);
      if (body) return body;
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      return {
        statusCode,
        code: codeForStatus(statusCode),
        message: messageForHttpException(exception),
        details: [],
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Erro inesperado no servidor. Tente novamente.',
      details: [],
    };
  }
}

// Rede de segurança para violações de restrição do banco que escaparam das validações dos services.
function fromPrismaError(
  error: Prisma.PrismaClientKnownRequestError,
): ErrorBody | null {
  switch (error.code) {
    case 'P2025': // registro não encontrado
      return {
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Registro não encontrado.',
        details: [],
      };
    case 'P2002': // unique
      return {
        statusCode: 409,
        code: 'CONFLICT',
        message: 'Já existe um registro com estes dados.',
        details: [],
      };
    case 'P2003': // foreign key
      return {
        statusCode: 422,
        code: 'INVALID_REFERENCE',
        message: 'Um dos registros referenciados não existe ou está em uso.',
        details: [],
      };
    default:
      return null; // cai no 500 genérico
  }
}

function codeForStatus(status: number): ErrorCode {
  if (status === 400) return 'VALIDATION_ERROR';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 503) return 'SERVICE_UNAVAILABLE';
  return status >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR';
}

function messageForHttpException(exception: HttpException): string {
  const status = exception.getStatus();
  if (status === 404) return 'Rota não encontrada.';
  if (status === 400) return 'Requisição inválida.'; // ex.: JSON malformado
  return exception.message;
}
