import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value;

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