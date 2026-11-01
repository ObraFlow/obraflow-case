import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  });

  const config = new DocumentBuilder()
    .setTitle('Obraflow API')
    .setDescription('API do Obraflow')
    .setVersion('1.0')
    .addTag('Suppliers', 'Gerenciamento de fornecedores')
    .addTag('Users', 'Gerenciamento de usuários')
    .addTag('Works', 'Gerenciamento de obras')
    .addTag('Orders', 'Gerenciamento de pedidos')
    .addTag('Approval Rules', 'Regras de Alçada')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  app.use(
    '/docs',
    apiReference({
      content: document,
      theme: 'purple',
      layout: 'modern',
      showSidebar: true,
      documentDownloadType: 'none',
    }),
  );

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`ObraFlow API rodando em http://localhost:${port}`);
}
void bootstrap();
