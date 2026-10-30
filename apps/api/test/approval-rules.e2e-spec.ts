import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { PrismaService } from '../src/common/prisma/prisma.service.js';
import { createTestApp, PROJECTS, resetDatabase, USERS } from './helpers.js';

describe('Regras de alçada (e2e)', () => {
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

  it('lista as faixas ordenadas, com início calculado e cobertura', async () => {
    const res = await api()
      .get(`/api/projects/${PROJECTS.mare}/approval-rules`)
      .expect(200);

    expect(res.body.coverage).toEqual({ status: 'FULL', uncoveredFrom: null });
    expect(
      res.body.data.map(
        (r: { fromAmount: string; maxAmount: string | null }) => [
          r.fromAmount,
          r.maxAmount,
        ],
      ),
    ).toEqual([
      ['0.00', '10000.00'],
      ['10000.01', '50000.00'],
      ['50000.01', null],
    ]);
  });

  it('obra sem faixa "sem limite" informa a partir de qual valor os pedidos são bloqueados', async () => {
    const res = await api()
      .get(`/api/projects/${PROJECTS.sol}/approval-rules`)
      .expect(200);
    expect(res.body.coverage).toEqual({
      status: 'PARTIAL',
      uncoveredFrom: '30000.01',
    });
  });

  it('resolve respeita os limites exatos das faixas', async () => {
    const resolve = async (amount: string) =>
      (
        await api()
          .get(`/api/projects/${PROJECTS.mare}/approval-rules/resolve`)
          .query({ amount })
          .expect(200)
      ).body.rule.position;

    expect(await resolve('0')).toBe(1);
    expect(await resolve('10000.00')).toBe(1);
    expect(await resolve('10000.01')).toBe(2);
    expect(await resolve('50000.01')).toBe(3);
  });

  it('resolve sem faixa aplicável responde matched: false (não é erro)', async () => {
    const res = await api()
      .get(`/api/projects/${PROJECTS.sol}/approval-rules/resolve`)
      .query({ amount: '45000' })
      .expect(200);
    expect(res.body).toMatchObject({ matched: false, rule: null });
    expect(res.body.message).toContain('R$ 45.000,00');
  });

  it('cria faixa e devolve o início calculado e a cadeia na ordem enviada', async () => {
    const res = await api()
      .post(`/api/projects/${PROJECTS.sol}/approval-rules`)
      .send({ maxAmount: null, approverIds: [USERS.carlos, USERS.amanda] })
      .expect(201);

    expect(res.body).toMatchObject({
      position: 3,
      fromAmount: '30000.01',
      maxAmount: null,
    });
    expect(
      res.body.approvers.map((a: { user: { id: number } }) => a.user.id),
    ).toEqual([USERS.carlos, USERS.amanda]);
  });

  it('limite duplicado na mesma obra → 409 DUPLICATE_LIMIT', async () => {
    const res = await api()
      .post(`/api/projects/${PROJECTS.mare}/approval-rules`)
      .send({ maxAmount: '10000', approverIds: [USERS.joao] })
      .expect(409);
    expect(res.body.code).toBe('DUPLICATE_LIMIT');
  });

  it('segunda faixa "sem limite" na mesma obra → 409 UNLIMITED_RULE_EXISTS', async () => {
    const res = await api()
      .post(`/api/projects/${PROJECTS.mare}/approval-rules`)
      .send({ maxAmount: null, approverIds: [USERS.joao] })
      .expect(409);
    expect(res.body.code).toBe('UNLIMITED_RULE_EXISTS');
  });

  it('aprovadores vazios ou repetidos → 400 apontando o campo', async () => {
    const empty = await api()
      .post(`/api/projects/${PROJECTS.torre}/approval-rules`)
      .send({ maxAmount: '1000', approverIds: [] })
      .expect(400);
    expect(empty.body.details).toEqual([
      { field: 'approverIds', message: 'Adicione pelo menos 1 aprovador.' },
    ]);

    const repeated = await api()
      .post(`/api/projects/${PROJECTS.torre}/approval-rules`)
      .send({ maxAmount: '1000', approverIds: [USERS.joao, USERS.joao] })
      .expect(400);
    expect(repeated.body.details[0].field).toBe('approverIds');
  });

  it('aprovador inexistente → 422 INVALID_REFERENCE', async () => {
    const res = await api()
      .post(`/api/projects/${PROJECTS.torre}/approval-rules`)
      .send({ maxAmount: '1000', approverIds: [999] })
      .expect(422);
    expect(res.body.code).toBe('INVALID_REFERENCE');
  });

  it('edições simultâneas da mesma faixa não se misturam', async () => {
    const chains = [
      [USERS.joao, USERS.amanda],
      [USERS.amanda, USERS.carlos, USERS.joao],
      [USERS.carlos],
      [USERS.fernando, USERS.joao],
    ];

    const responses = await Promise.all(
      chains.map((approverIds) =>
        api()
          .put('/api/approval-rules/2')
          .send({ maxAmount: '50000.00', approverIds }),
      ),
    );
    expect(responses.map((r) => r.status)).toEqual([200, 200, 200, 200]);

    // A cadeia final é exatamente uma das enviadas (a última a ser aplicada), nunca uma mistura.
    const final = await prisma.approvalRuleApprover.findMany({
      where: { ruleId: 2 },
      orderBy: { position: 'asc' },
    });
    expect(chains).toContainEqual(final.map((a) => a.userId));
  });

  it('editar reordena a cadeia; remover apaga a faixa', async () => {
    const [, second] = (
      await api().get(`/api/projects/${PROJECTS.mare}/approval-rules`)
    ).body.data;

    const updated = await api()
      .put(`/api/approval-rules/${second.id}`)
      .send({ maxAmount: '50000.00', approverIds: [USERS.amanda, USERS.joao] })
      .expect(200);
    expect(
      updated.body.approvers.map((a: { user: { id: number } }) => a.user.id),
    ).toEqual([USERS.amanda, USERS.joao]);

    await api().delete(`/api/approval-rules/${second.id}`).expect(204);
    await api().delete(`/api/approval-rules/${second.id}`).expect(404);
  });
});
