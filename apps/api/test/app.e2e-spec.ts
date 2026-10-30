import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './helpers.js';

describe('Infraestrutura da API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health responde ok com o banco no ar', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200, { status: 'ok' });
  });

  it('rota inexistente responde 404 no formato padrão de erro', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/nao-existe')
      .expect(404);
    expect(res.body).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Rota não encontrada.',
      details: [],
    });
  });

  it('JSON malformado responde 400 no formato padrão de erro', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"quebrado":')
      .expect(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});
