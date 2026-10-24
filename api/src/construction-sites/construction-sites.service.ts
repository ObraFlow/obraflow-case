import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateConstructionSiteDto } from './dto/create-construction-site.dto.js';

@Injectable()
export class ConstructionSitesService {
    constructor(private readonly prisma: PrismaService) { }

    findAll() {
        return this.prisma.constructionSite.findMany({ orderBy: { code: 'asc' } });
    }

    create(dto: CreateConstructionSiteDto) {
        return this.prisma.constructionSite.create({ data: dto });
    }
}