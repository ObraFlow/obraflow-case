import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length } from 'class-validator';
import { Trim } from '../common/validation/decorators.js';

export class CreateUserDto {
  /** @example "Fernando Souza" */
  @Trim()
  @Length(2, 120, { message: 'O nome deve ter entre 2 e 120 caracteres.' })
  @IsString({ message: 'Informe o nome.' })
  name: string;

  /** @example "fernando.souza@obraflow.dev" */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  /** @example "Coordenador de obra" */
  @Trim()
  @Length(2, 80, { message: 'O cargo deve ter entre 2 e 80 caracteres.' })
  @IsString({ message: 'Informe o cargo.' })
  jobTitle: string;
}
