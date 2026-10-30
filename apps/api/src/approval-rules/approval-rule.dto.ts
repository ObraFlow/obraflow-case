import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDefined,
  ValidateIf,
} from 'class-validator';
import { IsDecimalString, MONEY } from '../common/validation/decimal-string.js';
import { IsId } from '../common/validation/ids.js';

export class ApprovalRuleDto {
  /**
   * Limite superior da faixa (string decimal), ou null para "sem limite".
   * O início da faixa é calculado: limite da faixa anterior + R$ 0,01.
   * @example "50000.00"
   */
  @ValidateIf((dto: ApprovalRuleDto) => dto.maxAmount !== null)
  @IsDecimalString(
    { ...MONEY, min: 'positive' },
    {
      message:
        'O limite deve ser um valor maior que zero, com até 2 casas decimais.',
    },
  )
  @IsDefined({ message: 'Informe o limite da faixa ou marque "sem limite".' })
  maxAmount: string | null;

  /**
   * Aprovadores na ordem do fluxo: o primeiro do array aprova primeiro.
   * Reordenar = enviar o array na nova ordem.
   * @example [1, 2]
   */
  @IsId('Aprovador inválido.', { each: true })
  @ArrayUnique({
    message: 'O mesmo aprovador não pode aparecer duas vezes na faixa.',
  })
  @ArrayMaxSize(10, { message: 'A faixa pode ter no máximo 10 aprovadores.' })
  @ArrayMinSize(1, { message: 'Adicione pelo menos 1 aprovador.' })
  @IsArray({ message: 'Adicione pelo menos 1 aprovador.' })
  approverIds: number[];
}

export class ResolveRuleQuery {
  /** Valor a testar (string decimal). @example "23000.00" */
  @IsDecimalString(
    { ...MONEY, min: 'non-negative' },
    { message: 'Informe um valor válido, com até 2 casas decimais.' },
  )
  @Type(() => String)
  amount: string;
}
