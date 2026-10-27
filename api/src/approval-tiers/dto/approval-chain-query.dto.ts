import { Matches } from 'class-validator';
import { MONEY_MESSAGE, MONEY_REGEX } from '../../common/money.js';

export class ApprovalChainQueryDto {
  /**
   * Order total to look up.
   * @example "12500.00"
   */
  @Matches(MONEY_REGEX, { message: `amount ${MONEY_MESSAGE}` })
  amount: string;
}
