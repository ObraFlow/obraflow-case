import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SESSION_COOKIE } from './session/session-cookie.js';

/**
 * Interactive docs at /api/docs (JSON at /api/docs-json). DTO fields are
 * inferred from the TypeScript types and JSDoc comments by the Swagger CLI
 * plugin (nest-cli.json), so the DTOs need no extra decorators.
 */
export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('ObraFlow API')
    .setDescription(
      [
        'Purchase orders with tiered approval per construction site.',
        '',
        '**Session:** call `POST /api/session` with a user id (see `GET /api/users`).',
        'The server sets a session cookie that the browser sends on the next calls,',
        'including the ones made with "Try it out" on this page.',
        '',
        '**Numbers:** money and quantities travel as decimal strings (`"10000.00"`)',
        'to avoid floating point errors.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addCookieAuth(SESSION_COOKIE)
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
}
