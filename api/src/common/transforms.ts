// Value transforms for class-transformer's @Transform decorator.
// Non-string values pass through unchanged so the validators can reject them.

type TransformParams = { value: unknown };

export const trim = ({ value }: TransformParams) =>
  typeof value === 'string' ? value.trim() : value;

export const trimLowerCase = ({ value }: TransformParams) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export const digitsOnly = ({ value }: TransformParams) =>
  typeof value === 'string' ? value.replace(/\D/g, '') : value;
