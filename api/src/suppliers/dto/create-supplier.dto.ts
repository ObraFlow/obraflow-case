import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';
import { digitsOnly, trim } from '../../common/transforms.js';
import { IsCnpj } from '../../common/validators.js';

export class CreateSupplierDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  /**
   * CNPJ, with or without punctuation. Stored as 14 digits only, so formatted
   * and unformatted input match the same unique constraint.
   * @example "11.222.333/0001-81"
   */
  @Transform(digitsOnly)
  @IsString()
  @Length(14, 14, { message: 'o CNPJ deve ter 14 dígitos' })
  @IsCnpj()
  taxId: string;
}
