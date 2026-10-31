import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @MaxLength(120)
  name!: string;

  @IsEmail({}, { message: 'E-mail inválido.' })
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  role?: string;
}
