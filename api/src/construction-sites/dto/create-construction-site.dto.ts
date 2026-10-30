import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { trim } from '../../common/transforms.js';

export class CreateConstructionSiteDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;
}
