import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

/**
 * Filtro global: transforma qualquer exceção num corpo de erro consistente
 * ({ statusCode, error, message, path, timestamp }) e traduz erros conhecidos
 * do Prisma em respostas HTTP adequadas (ex.: unicidade -> 409, não achou -> 404).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Erro interno no servidor.';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      // Erros lançados por nós (NotFoundException, BadRequestException, etc.)
      // e os erros do ValidationPipe.
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        message = (body.message as string | string[]) ?? exception.message;
        error = (body.error as string) ?? error;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2025') {
        // Registro não encontrado (ex.: update/delete de id inexistente).
        status = HttpStatus.NOT_FOUND;
        message = 'Registro não encontrado.';
        error = 'Not Found';
      } else if (exception.code === 'P2002') {
        // Violação de unicidade (ex.: e-mail ou documento repetido).
        status = HttpStatus.CONFLICT;
        const target = (exception.meta?.target as string[] | undefined)?.join(
          ', ',
        );
        message = target
          ? `Já existe um registro com esse valor (${target}).`
          : 'Já existe um registro com esse valor.';
        error = 'Conflict';
      } else {
        status = HttpStatus.BAD_REQUEST;
        message = 'Requisição inválida para o banco de dados.';
        error = 'Bad Request';
      }
    }

    // Só logamos o stack de erros inesperados (5xx), para não poluir com 4xx.
    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
