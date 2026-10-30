import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module.js';
import { setupApp } from './app/setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  await app.listen(process.env.PORT ?? 3333);
}
await bootstrap();
