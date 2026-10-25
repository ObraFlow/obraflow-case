import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';
import { digitsOnly, trim } from '../../common/transforms.js';

export class CreateSupplierDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  // CNPJ stored as 14 digits only, so formatted and unformatted input match the
  // same unique constraint. Formatting (00.000.000/0000-00) is the UI's job.
  @Transform(digitsOnly)
  @IsString()
  @Length(14, 14, { message: 'taxId must have 14 digits (CNPJ)' })
  taxId: string;
}
