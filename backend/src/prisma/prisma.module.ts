import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

// @Global torna o PrismaService disponível em todos os módulos sem reimportar.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
