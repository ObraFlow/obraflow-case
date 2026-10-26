// Money travels as decimal strings ("10000.00") to avoid floating point errors.
// Up to 12 integer digits and 2 decimals, matching the Decimal(14, 2) columns.
export const MONEY_REGEX = /^\d{1,12}(\.\d{1,2})?$/;

export const MONEY_MESSAGE = 'must be a decimal string like "10000.00"';
