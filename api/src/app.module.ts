import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ConstructionSitesModule } from './construction-sites/construction-sites.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, ConstructionSitesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
