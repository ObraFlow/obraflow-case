import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  // Conecta ao banco quando o módulo sobe (Nest chama onModuleInit no bootstrap).
  async onModuleInit() {
    await this.$connect();
  }
}
