import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export const DATABASE = Symbol('DATABASE');

@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.getOrThrow<string>('DATABASE_URL');
        const client = postgres(url, { max: 10 });
        return drizzle(client);
      },
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
