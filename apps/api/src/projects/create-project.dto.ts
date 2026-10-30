import { IsOptional, IsString, Length } from 'class-validator';
import { EmptyToUndefined, Trim } from '../common/validation/decorators.js';

export class CreateProjectDto {
  /** @example "Torre das Artes" */
  @Trim()
  @Length(2, 120, {
    message: 'O nome da obra deve ter entre 2 e 120 caracteres.',
  })
  @IsString({ message: 'Informe o nome da obra.' })
  name: string;

  /** @example "Salvador" */
  @EmptyToUndefined()
  @Trim()
  @IsOptional()
  @Length(2, 80, { message: 'A cidade deve ter entre 2 e 80 caracteres.' })
  @IsString({ message: 'Cidade inválida.' })
  city?: string;
}
