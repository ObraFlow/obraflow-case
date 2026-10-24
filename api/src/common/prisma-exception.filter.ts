import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../generated/prisma/client.js';

const errors: Record<string, { status: number; message: string }> = {
    P2002: { status: HttpStatus.CONFLICT, message: 'Já existe um registro com esse valor.' },
    P2003: { status: HttpStatus.CONFLICT, message: 'Registro relacionado inexistente ou em uso.' },
    P2025: { status: HttpStatus.NOT_FOUND, message: 'Registro não encontrado.' },
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
    catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
        const response = host.switchToHttp().getResponse<Response>();
        const known = errors[error.code];

        if (!known) {
            throw error; // unknown database errors stay as 500
        }

        response.status(known.status).json({
            statusCode: known.status,
            message: known.message,
            code: error.code,
        });
    }
}