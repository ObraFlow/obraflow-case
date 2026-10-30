import { HttpException, HttpStatus } from '@nestjs/common';

// Códigos de erro do contrato (docs/api-contract.md). O front decide o que mostrar pelo `code`,
// e pode exibir `message` direto ao usuário.
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'STEP_NOT_CURRENT'
  | 'ORDER_ALREADY_DECIDED'
  | 'DUPLICATE_LIMIT'
  | 'UNLIMITED_RULE_EXISTS'
  | 'DUPLICATE_EMAIL'
  | 'NO_APPROVAL_RULE'
  | 'INVALID_REFERENCE'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export interface ErrorDetail {
  /** Caminho do campo, inclusive dentro de listas: "items.1.quantity". */
  field: string;
  message: string;
}

export interface ErrorBody {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details: ErrorDetail[];
}

/** Erro de negócio da API, já no formato de resposta do contrato. */
export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: ErrorCode,
    message: string,
    readonly details: ErrorDetail[] = [],
  ) {
    super(
      { statusCode: status, code, message, details } satisfies ErrorBody,
      status,
    );
  }

  static notFound(message: string) {
    return new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', message);
  }

  static conflict(code: ErrorCode, message: string) {
    return new AppException(HttpStatus.CONFLICT, code, message);
  }

  static unprocessable(
    code: ErrorCode,
    message: string,
    details: ErrorDetail[] = [],
  ) {
    return new AppException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      code,
      message,
      details,
    );
  }
}
