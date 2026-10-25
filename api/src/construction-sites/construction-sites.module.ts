import { Module } from '@nestjs/common';
import { ConstructionSitesController } from './construction-sites.controller.js';
import { ConstructionSitesService } from './construction-sites.service.js';

@Module({
  controllers: [ConstructionSitesController],
  providers: [ConstructionSitesService],
})
export class ConstructionSitesModule {}
