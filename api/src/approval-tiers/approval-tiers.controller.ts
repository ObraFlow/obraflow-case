import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApprovalTiersService } from './approval-tiers.service.js';
import { ApprovalChainQueryDto } from './dto/approval-chain-query.dto.js';
import { ApprovalTierDto } from './dto/approval-tier.dto.js';
import { RequireSession } from '../session/require-session.decorator.js';
import { ParseUuid } from '../common/parse-uuid.pipe.js';

// Listing and creating happen inside a site; update and delete only need the tier id.
@ApiTags('approval-tiers')
@Controller()
export class ApprovalTiersController {
  constructor(private readonly service: ApprovalTiersService) {}

  /** Tiers of a site, from the lowest limit up, with the derived minAmount. */
  @Get('construction-sites/:siteId/approval-tiers')
  @ApiNotFoundResponse({ description: 'Site not found.' })
  findBySite(@Param('siteId', ParseUuid) siteId: string) {
    return this.service.findBySite(siteId);
  }

  /** Creates a tier with its ordered approvers. */
  @Post('construction-sites/:siteId/approval-tiers')
  @RequireSession()
  @ApiBadRequestResponse({
    description: 'Invalid payload or unknown approver.',
  })
  @ApiNotFoundResponse({ description: 'Site not found.' })
  @ApiConflictResponse({
    description: 'The site already has a tier with this limit.',
  })
  create(
    @Param('siteId', ParseUuid) siteId: string,
    @Body() dto: ApprovalTierDto,
  ) {
    return this.service.create(siteId, dto);
  }

  /** One tier with its ordered approvers and the derived minAmount. */
  @Get('approval-tiers/:id')
  @ApiNotFoundResponse({ description: 'Tier not found.' })
  findOne(@Param('id', ParseUuid) id: string) {
    return this.service.findOne(id);
  }

  /** Replaces the tier: send the final approver list to add, remove or reorder. */
  @Put('approval-tiers/:id')
  @RequireSession()
  @ApiBadRequestResponse({
    description: 'Invalid payload or unknown approver.',
  })
  @ApiNotFoundResponse({ description: 'Tier not found.' })
  @ApiConflictResponse({
    description: 'The site already has a tier with this limit.',
  })
  update(@Param('id', ParseUuid) id: string, @Body() dto: ApprovalTierDto) {
    return this.service.update(id, dto);
  }

  /** Deletes the tier. Existing orders keep their own copy of the chain. */
  @Delete('approval-tiers/:id')
  @RequireSession()
  @ApiNotFoundResponse({ description: 'Tier not found.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUuid) id: string) {
    await this.service.remove(id);
  }

  /** Which chain applies to an amount; tier is null when no tier covers it. */
  @Get('construction-sites/:siteId/approval-chain')
  @ApiNotFoundResponse({ description: 'Site not found.' })
  getChain(
    @Param('siteId', ParseUuid) siteId: string,
    @Query() query: ApprovalChainQueryDto,
  ) {
    return this.service.getChain(siteId, query.amount);
  }
}
