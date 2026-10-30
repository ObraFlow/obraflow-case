import { Transform } from 'class-transformer';
import { registerDecorator, type ValidationOptions } from 'class-validator';

// Dinheiro e quantidade trafegam como string decimal ("12500.00"), nunca como float.
// Aceita number por conveniência e converte para string antes de validar.

interface DecimalStringOptions {
  /** Máximo de casas decimais (2 para dinheiro, 3 para quantidade). */
  decimals: number;
  /** Máximo de dígitos na parte inteira (respeita a precisão da coluna numeric). */
  integerDigits: number;
  /** "positive" exige > 0; "non-negative" aceita 0. */
  min: 'positive' | 'non-negative';
}

export function IsDecimalString(
  options: DecimalStringOptions,
  validationOptions?: ValidationOptions,
) {
  const pattern = new RegExp(
    `^\\d{1,${options.integerDigits}}(\\.\\d{1,${options.decimals}})?$`,
  );

  return function (target: object, propertyName: string) {
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'number'
        ? String(value)
        : typeof value === 'string'
          ? value.trim()
          : value,
    )(target, propertyName);

    registerDecorator({
      name: 'isDecimalString',
      target: target.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string' || !pattern.test(value)) return false;
          return options.min === 'non-negative' || Number(value) > 0;
        },
      },
    });
  };
}

export const MONEY = { decimals: 2, integerDigits: 12 } as const; // numeric(14,2)
export const QUANTITY = { decimals: 3, integerDigits: 9 } as const; // numeric(12,3)
