import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
    });
    super({ adapter });
  }

  async onModuleInit() {
    // With a driver adapter, $connect() does not open a connection (the pg pool
    // connects lazily). A real query makes the app fail at startup when the
    // database is unreachable, instead of on the first request.
    await this.$queryRaw`SELECT 1`;
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
