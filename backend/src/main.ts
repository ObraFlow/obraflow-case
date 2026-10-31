import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';
import { DecimalInterceptor } from './common/decimal.interceptor.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {});
  // Libera o frontend (origem configurável via CORS_ORIGIN; padrão: qualquer origem em dev).
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new DecimalInterceptor());
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
