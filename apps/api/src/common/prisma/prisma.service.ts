import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../prisma/generated/client.js';

// Cliente Prisma injetável. O Prisma 7 conecta no Postgres via driver adapter (node-postgres).
// A conexão é aberta sob demanda: a API sobe mesmo com o banco fora do ar,
// e o /health responde 503 em vez de a aplicação nem iniciar.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: config.getOrThrow<string>('DATABASE_URL'),
      }),
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
