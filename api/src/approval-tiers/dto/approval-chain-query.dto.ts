import { Matches } from 'class-validator';
import { MONEY_MESSAGE, MONEY_REGEX } from '../../common/money.js';

export class ApprovalChainQueryDto {
  @Matches(MONEY_REGEX, { message: `amount ${MONEY_MESSAGE}` })
  amount: string;
}
