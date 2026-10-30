import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderStatus, Unit } from '../../prisma/generated/enums.js';
import {
  IsDecimalString,
  MONEY,
  QUANTITY,
} from '../common/validation/decimal-string.js';
import { EmptyToUndefined, Trim } from '../common/validation/decorators.js';
import { IsId } from '../common/validation/ids.js';

export class OrderItemDto {
  /** @example "Cimento CP-II 50kg" */
  @Trim()
  @Length(2, 200, { message: 'A descrição deve ter entre 2 e 200 caracteres.' })
  @IsNotEmpty({ message: 'Informe a descrição do item.' })
  @IsString({ message: 'Informe a descrição do item.' })
  description: string;

  /** Quantidade (string decimal, até 3 casas). @example "100" */
  @IsDecimalString(
    { ...QUANTITY, min: 'positive' },
    {
      message:
        'A quantidade deve ser um número maior que zero, com até 3 casas decimais.',
    },
  )
  quantity: string;

  /** @example "sc" */
  @IsEnum(Unit, { message: 'Selecione uma unidade válida.' })
  unit: Unit;

  /** Preço unitário (string decimal, até 2 casas). @example "32.00" */
  @IsDecimalString(
    { ...MONEY, min: 'non-negative' },
    {
      message:
        'O preço unitário deve ser um valor maior ou igual a zero, com até 2 casas decimais.',
    },
  )
  unitPrice: string;
}

export class CreatePurchaseOrderDto {
  /** @example 1 */
  @IsId('Selecione a obra.')
  projectId: number;

  /** @example 1 */
  @IsId('Selecione o fornecedor.')
  supplierId: number;

  /** Quem está fazendo o pedido (usuário de "Visualizando como"). @example 4 */
  @IsId('Informe o solicitante.')
  requesterId: number;

  /** Data do pedido (AAAA-MM-DD). @example "2026-10-22" */
  @IsDateString({ strict: true }, { message: 'Informe uma data válida.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Informe a data do pedido.' })
  orderDate: string;

  /** @example "Concretagem agendada para sexta-feira." */
  @EmptyToUndefined()
  @Trim()
  @IsOptional()
  @MaxLength(1000, {
    message: 'As observações devem ter no máximo 1000 caracteres.',
  })
  @IsString({ message: 'Observações inválidas.' })
  notes?: string;

  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @ArrayMaxSize(100, { message: 'O pedido pode ter no máximo 100 itens.' })
  @ArrayMinSize(1, { message: 'O pedido precisa ter pelo menos 1 item.' })
  @IsArray({ message: 'O pedido precisa ter pelo menos 1 item.' })
  items: OrderItemDto[];
}

export class ListPurchaseOrdersQuery {
  @IsOptional()
  @IsEnum(OrderStatus, { message: 'Situação inválida.' })
  status?: OrderStatus;

  @IsOptional()
  @Type(() => Number)
  @IsId('Obra inválida.')
  projectId?: number;

  /** Só pedidos cuja etapa atual é deste usuário ("Aguardando minha decisão"). */
  @IsOptional()
  @Type(() => Number)
  @IsId('Usuário inválido.')
  awaitingUserId?: number;

  /** Busca por fornecedor ou código ("PED-009" ou "9"). */
  @EmptyToUndefined()
  @Trim()
  @IsOptional()
  @MaxLength(120, { message: 'A busca deve ter no máximo 120 caracteres.' })
  @IsString({ message: 'Busca inválida.' })
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'Página inválida.' })
  @IsInt({ message: 'Página inválida.' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Max(100, { message: 'O tamanho máximo da página é 100.' })
  @Min(1, { message: 'Tamanho de página inválido.' })
  @IsInt({ message: 'Tamanho de página inválido.' })
  pageSize: number = 20;
}

export class ApproveDto {
  /** Etapa que o usuário estava vendo ao decidir (controle de concorrência). @example 32 */
  @IsId('Etapa inválida.')
  stepId: number;
}

export class RejectDto extends ApproveDto {
  /** @example "Preço acima da cotação de referência." */
  @Trim()
  @Length(10, 1000, {
    message: 'Descreva o motivo da rejeição (mínimo de 10 caracteres).',
  })
  @IsString({ message: 'Informe o motivo da rejeição.' })
  reason: string;
}
