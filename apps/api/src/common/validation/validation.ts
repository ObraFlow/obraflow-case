import {
  HttpStatus,
  ValidationPipe,
  type ValidationError,
} from '@nestjs/common';
import { AppException, type ErrorDetail } from '../errors/app.exception.js';

/**
 * Validação global dos DTOs:
 * - whitelist: campos não declarados no DTO são descartados (ex.: um "total" enviado pelo cliente é ignorado);
 * - transform: converte o corpo/query para as classes dos DTOs (e strings da query para números, via @Type).
 */
export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) =>
      new AppException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Dados inválidos.',
        flattenValidationErrors(errors),
      ),
  });
}

/**
 * Achata a árvore de erros do class-validator em uma lista com o caminho de cada campo.
 * Itens de listas viram "items.1.quantity" — o front usa isso para marcar a linha certa.
 * Mostra só a primeira mensagem de cada campo, que é a mais relevante para o usuário.
 */
export function flattenValidationErrors(
  errors: ValidationError[],
  parent = '',
): ErrorDetail[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const [message] = Object.values(error.constraints ?? {});
    const own = message ? [{ field, message }] : [];
    return [...own, ...flattenValidationErrors(error.children ?? [], field)];
  });
}
