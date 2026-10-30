import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

/** First number in class-validator's default message ("... than or equal to 200 characters"). */
const numberIn = (message: string) => /\d+/.exec(message)?.[0] ?? '';

/** Portuguese text for class-validator's built-in constraints. */
const messages: Partial<Record<string, (defaultMessage: string) => string>> = {
  whitelistValidation: () => 'campo não permitido',
  isUuid: () => 'deve ser um identificador (UUID) válido',
  isNotEmpty: () => 'é obrigatório',
  isString: () => 'deve ser um texto',
  isArray: () => 'deve ser uma lista',
  isInt: () => 'deve ser um número inteiro',
  isBoolean: () => 'deve ser true ou false',
  isEmail: () => 'deve ser um e-mail válido',
  maxLength: (m) => `deve ter no máximo ${numberIn(m)} caracteres`,
  min: (m) => `deve ser no mínimo ${numberIn(m)}`,
  max: (m) => `deve ser no máximo ${numberIn(m)}`,
  arrayMinSize: (m) => `deve ter pelo menos ${numberIn(m)} item(ns)`,
  arrayMaxSize: (m) => `deve ter no máximo ${numberIn(m)} itens`,
  arrayUnique: () => 'não pode ter valores repetidos',
  isEnum: (m) => `deve ser um destes valores: ${m.split(': ')[1] ?? ''}`,
  isIn: (m) => `deve ser um destes valores: ${m.split(': ')[1] ?? ''}`,
};

/**
 * class-validator's default messages start with the property name ("reason
 * should not be empty", "each value in ...", "property x should not exist").
 * Anything else was written by hand in a DTO and is already in Portuguese.
 */
function isDefaultMessage(property: string, message: string) {
  return (
    message.startsWith(`${property} `) ||
    message.startsWith('each value in ') ||
    message.startsWith('property ')
  );
}

/** "items.0.quantity: use um número decimal..." for every failed constraint. */
export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): string[] {
  return errors.flatMap((error) => {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const own = Object.entries(error.constraints ?? {}).map(
      ([key, message]) => {
        const translate = messages[key];
        const text =
          translate && isDefaultMessage(error.property, message)
            ? translate(message)
            : message;
        return `${path}: ${text}`;
      },
    );
    return [...own, ...flattenValidationErrors(error.children ?? [], path)];
  });
}

/** Validates every payload; unknown fields are refused; errors come in Portuguese. */
export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new BadRequestException(flattenValidationErrors(errors)),
  });
}
