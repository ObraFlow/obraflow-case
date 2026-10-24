import { Body, Controller, Get, Post } from '@nestjs/common';
import { ConstructionSitesService } from './construction-sites.service.js';
import { CreateConstructionSiteDto } from './dto/create-construction-site.dto.js';

@Controller('construction-sites')
export class ConstructionSitesController {
    constructor(private readonly service: ConstructionSitesService) { }

    @Get()
    findAll() {
        return this.service.findAll();
    }

    @Post()
    create(@Body() dto: CreateConstructionSiteDto) {
        return this.service.create(dto);
    }
}