import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      // 503 tells clients (and the UI retry state) the service is temporarily
      // unavailable, unlike a 500 that signals a bug.
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      });
    }
    return { status: 'ok', database: 'up' };
  }
}
