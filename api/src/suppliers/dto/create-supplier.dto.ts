import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';
import { digitsOnly, trim } from '../../common/transforms.js';

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
  @Length(14, 14, { message: 'taxId must have 14 digits (CNPJ)' })
  taxId: string;
}
