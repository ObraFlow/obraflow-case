import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

// Global: todos os módulos de domínio usam o banco, então não precisam importar este módulo.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
