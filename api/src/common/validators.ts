import { ValidateBy, type ValidationOptions } from 'class-validator';

// ---------------------------------------------------------------------------
// Order date
// ---------------------------------------------------------------------------

/** Earliest order date accepted. Older dates are almost always typos (0226, 1926). */
export const MIN_ORDER_DATE = '2000-01-01';

/**
 * Latest order date accepted: one year after today, plus one day so a user
 * ahead of UTC (or behind it) is never refused at the edge.
 */
export function maxOrderDate(now = new Date()) {
  const max = new Date(
    Date.UTC(now.getUTCFullYear() + 1, now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return max.toISOString().slice(0, 10);
}

/** YYYY-MM-DD between MIN_ORDER_DATE and maxOrderDate() (string comparison works for ISO dates). */
export function IsOrderDateInRange(options?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isOrderDateInRange',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' &&
          value >= MIN_ORDER_DATE &&
          value <= maxOrderDate(),
        defaultMessage: () =>
          'a data deve estar entre 2000-01-01 e um ano depois de hoje',
      },
    },
    options,
  );
}

// ---------------------------------------------------------------------------
// CNPJ
// ---------------------------------------------------------------------------

function cnpjCheckDigit(digits: string) {
  // Weights go 2..9 from right to left, then restart at 2.
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const weight = ((digits.length - 1 - i) % 8) + 2;
    sum += Number(digits[i]) * weight;
  }
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

/** 14 digits with valid check digits (and not all the same digit, like 00000000000000). */
export function isValidCnpj(value: string) {
  if (!/^\d{14}$/.test(value) || /^(\d)\1{13}$/.test(value)) return false;
  const first = cnpjCheckDigit(value.slice(0, 12));
  const second = cnpjCheckDigit(value.slice(0, 12) + first);
  return value.endsWith(`${first}${second}`);
}

export function IsCnpj(options?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isCnpj',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && isValidCnpj(value),
        defaultMessage: () =>
          'CNPJ inválido (confira os dígitos verificadores)',
      },
    },
    options,
  );
}
