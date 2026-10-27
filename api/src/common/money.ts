// Money travels as decimal strings ("10000.00") to avoid floating point errors.
// Up to 12 integer digits and 2 decimals, matching the Decimal(14, 2) columns.
export const MONEY_REGEX = /^\d{1,12}(\.\d{1,2})?$/;

export const MONEY_MESSAGE = 'must be a decimal string like "10000.00"';

/** Largest value a Decimal(14, 2) column can hold. */
export const MAX_MONEY = '999999999999.99';

// Quantities have 3 decimals (e.g. 2.5 m³, 0.125 t), matching Decimal(14, 3).
export const QUANTITY_REGEX = /^\d{1,11}(\.\d{1,3})?$/;

export const QUANTITY_MESSAGE = 'must be a decimal string like "2.500"';
