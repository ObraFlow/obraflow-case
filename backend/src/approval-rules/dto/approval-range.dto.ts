import {
    ArrayMinSize,
    IsArray,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class CreateApprovalRangeDto {
    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Valor mínimo inválido.' })
    @Min(0, { message: 'O valor mínimo não pode ser negativo.' })
    minValue!: number;

    /** null/ausente = faixa aberta para cima (+∞). */
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Valor máximo inválido.' })
    @Min(0, { message: 'O valor máximo não pode ser negativo.' })
    maxValue?: number | null;

    @IsArray()
    @ArrayMinSize(1, { message: 'A faixa precisa de ao menos um aprovador.' })
    @IsString({ each: true })
    approverUserIds!: string[];
}

export class UpdateApprovalRangeDto {
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Valor mínimo inválido.' })
    @Min(0, { message: 'O valor mínimo não pode ser negativo.' })
    minValue?: number;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Valor máximo inválido.' })
    @Min(0, { message: 'O valor máximo não pode ser negativo.' })
    maxValue?: number | null;

    @IsOptional()
    @IsArray()
    @ArrayMinSize(1, { message: 'A faixa precisa de ao menos um aprovador.' })
    @IsString({ each: true })
    approverUserIds?: string[];
}
