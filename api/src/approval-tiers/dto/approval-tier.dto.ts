import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsUUID,
  Matches,
  ValidateIf,
} from 'class-validator';
import { MONEY_MESSAGE, MONEY_REGEX } from '../../common/money.js';

/**
 * Used for both create (POST) and update (PUT): an update replaces the whole tier,
 * so adding, removing and reordering approvers is just sending the final list.
 */
export class ApprovalTierDto {
  // null means "no upper limit". A missing field is undefined, not null, so it
  // still fails validation: the client must send null explicitly.
  @ValidateIf((dto: ApprovalTierDto) => dto.maxAmount !== null)
  @Matches(MONEY_REGEX, { message: `maxAmount ${MONEY_MESSAGE} or null` })
  maxAmount: string | null;

  // Order of the array is the order of the approval chain.
  @IsArray()
  @ArrayMinSize(1, { message: 'A tier needs at least one approver' })
  @ArrayUnique({ message: 'An approver cannot appear twice in the same tier' })
  @IsUUID('all', { each: true })
  approverIds: string[];
}
