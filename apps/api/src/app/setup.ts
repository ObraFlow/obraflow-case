import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/** Configuração HTTP compartilhada entre o main.ts e os testes e2e. */
export function setupApp(app: INestApplication) {
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: config.get<string>('WEB_ORIGIN', 'http://localhost:3030'),
  });
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Dokimos API')
      .setDescription(
        'Pedidos de compra com aprovação por alçada. Contrato completo em docs/api-contract.md.',
      )
      .setVersion('1.0')
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document);
}
