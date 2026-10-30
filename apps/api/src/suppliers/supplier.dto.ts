import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { EmptyToUndefined, Trim } from '../common/validation/decorators.js';

export class CreateSupplierDto {
  /** @example "Amanco" */
  @Trim()
  @Length(2, 120, {
    message: 'O nome do fornecedor deve ter entre 2 e 120 caracteres.',
  })
  @IsString({ message: 'Informe o nome do fornecedor.' })
  name: string;

  /**
   * CNPJ, com ou sem pontuação. É gravado só com os dígitos, para que
   * "12.345.678/0001-90" e "12345678000190" sejam reconhecidos como o mesmo fornecedor.
   * @example "12.345.678/0001-90"
   */
  @EmptyToUndefined()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/[./\-\s]/g, '') : value,
  )
  @IsOptional()
  @Matches(/^\d{14}$/, { message: 'CNPJ inválido.' })
  taxId?: string;
}

export class ListSuppliersQuery {
  /** Busca por nome (sem diferenciar maiúsculas). @example "voto" */
  @EmptyToUndefined()
  @Trim()
  @IsOptional()
  @Length(1, 120, { message: 'A busca deve ter no máximo 120 caracteres.' })
  @IsString({ message: 'Busca inválida.' })
  q?: string;
}
