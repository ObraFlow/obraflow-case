import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiTags } from '@nestjs/swagger';
import { ConstructionSitesService } from './construction-sites.service.js';
import { CreateConstructionSiteDto } from './dto/create-construction-site.dto.js';
import { RequireSession } from '../session/require-session.decorator.js';

@ApiTags('construction-sites')
@Controller('construction-sites')
export class ConstructionSitesController {
  constructor(private readonly service: ConstructionSitesService) {}

  /** All construction sites, sorted by code. */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** Creates a construction site. */
  @Post()
  @RequireSession()
  @ApiConflictResponse({ description: 'Code already in use.' })
  create(@Body() dto: CreateConstructionSiteDto) {
    return this.service.create(dto);
  }
}
