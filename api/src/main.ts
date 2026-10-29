import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { MoneyFormatInterceptor } from './common/money-format.interceptor.js';
import { PrismaExceptionFilter } from './common/prisma-exception.filter.js';
import { createValidationPipe } from './common/validation.js';
import { setupSwagger } from './swagger.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  // Convert Prisma exceptions to HTTP responses. The adapter lets unknown errors
  // fall back to Nest's default handler.
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaExceptionFilter(httpAdapter));

  // Validate all payloads (unknown fields refused, errors in Portuguese).
  app.useGlobalPipes(createValidationPipe());

  // Money fields always go out with two decimals ("10000.00").
  app.useGlobalInterceptors(new MoneyFormatInterceptor());

  // Parses cookies and verifies the signature of the session cookie.
  app.use(
    cookieParser(app.get(ConfigService).getOrThrow<string>('COOKIE_SECRET')),
  );

  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
