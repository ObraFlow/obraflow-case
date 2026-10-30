import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';
import { trim } from '../../common/transforms.js';

/**
 * The order version the user saw on screen. A decision on an outdated version
 * is refused (409), unless it repeats a decision this user already made.
 */
export class ApproveDto {
  @IsInt()
  @Min(0)
  version: number;
}

export class RejectDto extends ApproveDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'informe o motivo da rejeição' })
  @MaxLength(500)
  reason: string;
}
