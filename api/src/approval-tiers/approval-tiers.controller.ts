import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApprovalTiersService } from './approval-tiers.service.js';
import { ApprovalChainQueryDto } from './dto/approval-chain-query.dto.js';
import { ApprovalTierDto } from './dto/approval-tier.dto.js';

// Listing and creating happen inside a site; update and delete only need the tier id.
@Controller()
export class ApprovalTiersController {
  constructor(private readonly service: ApprovalTiersService) {}

  @Get('construction-sites/:siteId/approval-tiers')
  findBySite(@Param('siteId', ParseUUIDPipe) siteId: string) {
    return this.service.findBySite(siteId);
  }

  @Post('construction-sites/:siteId/approval-tiers')
  create(
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @Body() dto: ApprovalTierDto,
  ) {
    return this.service.create(siteId, dto);
  }

  @Put('approval-tiers/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApprovalTierDto) {
    return this.service.update(id, dto);
  }

  @Delete('approval-tiers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id);
  }

  /** Which chain applies to an amount; tier is null when no tier covers it. */
  @Get('construction-sites/:siteId/approval-chain')
  getChain(
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @Query() query: ApprovalChainQueryDto,
  ) {
    return this.service.getChain(siteId, query.amount);
  }
}
