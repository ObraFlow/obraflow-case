import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { PrismaService } from '../src/common/prisma/prisma.service.js';
import { createTestApp, resetDatabase } from './helpers.js';

describe('Cadastros (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(() => resetDatabase(prisma));

  afterAll(async () => {
    await app.close();
  });

  it('CNPJ é gravado só com dígitos e reconhecido com ou sem pontuação', async () => {
    const created = await api()
      .post('/api/suppliers')
      .send({ name: 'Amanco', taxId: '12.345.678/0001-90' })
      .expect(201);
    expect(created.body.taxId).toBe('12345678000190');

    const duplicated = await api()
      .post('/api/suppliers')
      .send({ name: 'Amanco Filial', taxId: '12345678000190' })
      .expect(409);
    expect(duplicated.body.code).toBe('CONFLICT');
  });

  it('e-mail de usuário é normalizado e único', async () => {
    const res = await api()
      .post('/api/users')
      .send({
        name: 'Outro João',
        email: '  JOAO.RIBEIRO@obraflow.dev ',
        jobTitle: 'Estagiário',
      })
      .expect(409);
    expect(res.body.code).toBe('DUPLICATE_EMAIL');
  });

  it('obras trazem a cobertura das faixas', async () => {
    const res = await api().get('/api/projects').expect(200);
    expect(
      res.body.data.map((p: { name: string; coverage: string }) => [
        p.name,
        p.coverage,
      ]),
    ).toEqual([
      ['Edifício Maré', 'FULL'],
      ['Residencial Sol Nascente', 'PARTIAL'],
      ['Torre das Artes', 'NONE'],
    ]);
  });
});
