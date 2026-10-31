import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome da obra é obrigatório.' })
  @MaxLength(120)
  name!: string;
}
