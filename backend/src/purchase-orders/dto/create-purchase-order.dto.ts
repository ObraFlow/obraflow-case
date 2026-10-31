import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsDateString,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator';

export class CreatePurchaseOrderItemDto {
    @IsString()
    @IsNotEmpty({ message: 'A descrição do item é obrigatória.' })
    description!: string;

    @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Quantidade deve ser numérica.' })
    @Min(0.001, { message: 'A quantidade deve ser maior que zero.' })
    quantity!: number;

    @IsString()
    @IsNotEmpty({ message: 'A unidade é obrigatória.' })
    unit!: string;

    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Preço unitário deve ser numérico.' })
    @Min(0, { message: 'O preço unitário não pode ser negativo.' })
    unitPrice!: number;
}

export class CreatePurchaseOrderDto {
    @IsString()
    @IsNotEmpty({ message: 'A obra é obrigatória.' })
    projectId!: string;

    @IsString()
    @IsNotEmpty({ message: 'O fornecedor é obrigatório.' })
    supplierId!: string;

    @IsDateString({}, { message: 'Data do pedido inválida.' })
    orderDate!: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsArray()
    @ArrayMinSize(1, { message: 'O pedido precisa de ao menos um item.' })
    @ValidateNested({ each: true })
    @Type(() => CreatePurchaseOrderItemDto)
    items!: CreatePurchaseOrderItemDto[];
}
