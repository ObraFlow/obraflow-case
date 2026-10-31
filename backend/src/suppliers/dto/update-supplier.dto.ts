import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  document?: string;
}
