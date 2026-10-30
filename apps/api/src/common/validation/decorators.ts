import { Transform } from 'class-transformer';

/** Remove espaços das pontas de strings ("  Cimento " → "Cimento") antes de validar. */
export function Trim() {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
}

/** Converte string vazia (ou só espaços) em undefined — campo opcional deixado em branco. */
export function EmptyToUndefined() {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  );
}
