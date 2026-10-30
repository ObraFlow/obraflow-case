import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { PrismaService } from '../src/common/prisma/prisma.service.js';
import {
  createTestApp,
  PROJECTS,
  resetDatabase,
  SUPPLIERS,
  USERS,
} from './helpers.js';

interface Step {
  id: number;
  position: number;
  status: string;
  approver: { id: number };
}

const validOrder = (overrides: Record<string, unknown> = {}) => ({
  projectId: PROJECTS.mare,
  supplierId: SUPPLIERS.votorantim,
  requesterId: USERS.beatriz,
  orderDate: '2026-10-22',
  items: [
    {
      description: 'Cimento CP-II 50kg',
      quantity: '100',
      unit: 'sc',
      unitPrice: '32.00',
    },
    {
      description: 'Areia média',
      quantity: '12.5',
      unit: 'm3',
      unitPrice: '145.00',
    },
  ],
  ...overrides,
});

describe('Pedidos de compra (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const api = () => request(app.getHttpServer());

  /** Etapa atual do pedido, como o front a enxerga. */
  const currentStepOf = async (orderId: number): Promise<Step> => {
    const { body } = await api()
      .get(`/api/purchase-orders/${orderId}`)
      .expect(200);
    return body.steps[body.currentStep - 1];
  };

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(() => resetDatabase(prisma));

  afterAll(async () => {
    await app.close();
  });

  describe('criação', () => {
    it('calcula os totais no backend, ignora total enviado pelo cliente e monta a cadeia da faixa', async () => {
      const res = await api()
        .post('/api/purchase-orders')
        .send(
          validOrder({ items: [...validOrder().items], totalAmount: '1.00' }),
        )
        .expect(201);

      expect(res.body.totalAmount).toBe('5012.50'); // 3200.00 + 1812.50
      expect(res.body.items.map((i: { total: string }) => i.total)).toEqual([
        '3200.00',
        '1812.50',
      ]);
      expect(res.body.appliedRule).toEqual({
        fromAmount: '0.00',
        maxAmount: '10000.00',
      });
      expect(res.body.status).toBe('PENDING');
      expect(res.body.currentStep).toBe(1);
      expect(
        res.body.steps.map((s: Step) => [s.approver.id, s.status]),
      ).toEqual([[USERS.joao, 'PENDING']]);
      expect(res.body.history).toMatchObject([
        { type: 'CREATED', actor: { id: USERS.beatriz } },
      ]);
    });

    it('cadeia com várias etapas: 1ª PENDING, demais WAITING', async () => {
      const res = await api()
        .post('/api/purchase-orders')
        .send(
          validOrder({
            items: [
              {
                description: 'Locação de grua',
                quantity: '1',
                unit: 'un',
                unitPrice: '60000',
              },
            ],
          }),
        )
        .expect(201);
      expect(res.body.steps.map((s: Step) => s.status)).toEqual([
        'PENDING',
        'WAITING',
        'WAITING',
      ]);
    });

    it('total sem faixa aplicável → 422 NO_APPROVAL_RULE e nada é gravado', async () => {
      const before = await prisma.purchaseOrder.count();

      const res = await api()
        .post('/api/purchase-orders')
        .send(
          validOrder({
            projectId: PROJECTS.sol,
            items: [
              {
                description: 'Grua',
                quantity: '1',
                unit: 'un',
                unitPrice: '45000',
              },
            ],
          }),
        )
        .expect(422);

      expect(res.body.code).toBe('NO_APPROVAL_RULE');
      expect(await prisma.purchaseOrder.count()).toBe(before);
    });

    it('itens inválidos → 400 com o caminho de cada campo', async () => {
      const res = await api()
        .post('/api/purchase-orders')
        .send(
          validOrder({
            supplierId: undefined,
            items: [
              {
                description: 'Cimento',
                quantity: '1',
                unit: 'sc',
                unitPrice: '1',
              },
              {
                description: 'Areia',
                quantity: '-5',
                unit: 'm3',
                unitPrice: '145',
              },
              { description: '', quantity: '1', unit: 'xx', unitPrice: 'abc' },
            ],
          }),
        )
        .expect(400);

      expect(res.body.details.map((d: { field: string }) => d.field)).toEqual([
        'supplierId',
        'items.1.quantity',
        'items.2.description',
        'items.2.unit',
        'items.2.unitPrice',
      ]);
    });

    it('pedido sem itens → 400', async () => {
      const res = await api()
        .post('/api/purchase-orders')
        .send(validOrder({ items: [] }))
        .expect(400);
      expect(res.body.details).toEqual([
        { field: 'items', message: 'O pedido precisa ter pelo menos 1 item.' },
      ]);
    });

    it('total que não cabe no banco → 400 no item (e não 500)', async () => {
      const res = await api()
        .post('/api/purchase-orders')
        .send(
          validOrder({
            items: [
              {
                description: 'Item fora de escala',
                quantity: '999999999',
                unit: 'un',
                unitPrice: '999999999999.99',
              },
            ],
          }),
        )
        .expect(400);
      expect(res.body.details).toEqual([
        {
          field: 'items.0',
          message: 'O total do item excede o valor máximo permitido.',
        },
      ]);
    });

    it('id fora do intervalo do banco → 400 (e não 500)', async () => {
      await api().get('/api/purchase-orders/99999999999').expect(400);
      await api().get('/api/purchase-orders/abc').expect(400);
      const res = await api()
        .post('/api/purchase-orders')
        .send(validOrder({ projectId: 99999999999 }))
        .expect(400);
      expect(res.body.details[0].field).toBe('projectId');
    });

    it('referências inexistentes → 422 INVALID_REFERENCE', async () => {
      const res = await api()
        .post('/api/purchase-orders')
        .send(validOrder({ projectId: 999 }))
        .expect(422);
      expect(res.body.code).toBe('INVALID_REFERENCE');
    });
  });

  describe('listagem', () => {
    it('filtra "aguardando minha decisão" e traz os contadores das abas', async () => {
      const res = await api()
        .get('/api/purchase-orders')
        .query({ awaitingUserId: USERS.amanda })
        .expect(200);

      expect(res.body.data.map((o: { code: string }) => o.code)).toEqual([
        'PED-011',
        'PED-009',
        'PED-007',
      ]);
      expect(res.body.counts).toEqual({
        awaiting: 3,
        pending: 5,
        approved: 3,
        rejected: 3,
        all: 11,
      });
    });

    it('busca por código ou fornecedor', async () => {
      const byCode = await api()
        .get('/api/purchase-orders')
        .query({ q: 'PED-009' });
      expect(byCode.body.data.map((o: { id: number }) => o.id)).toEqual([9]);

      const bySupplier = await api()
        .get('/api/purchase-orders')
        .query({ q: 'gerdau' });
      expect(bySupplier.body.data).toHaveLength(2);
    });
  });

  describe('decisões', () => {
    it('aprovar avança para a próxima etapa; a última aprovação aprova o pedido', async () => {
      // PED-009: João aprovou, Amanda é a etapa atual (última).
      const step = await currentStepOf(9);
      expect(step.approver.id).toBe(USERS.amanda);

      const res = await api()
        .post('/api/purchase-orders/9/approve')
        .send({ stepId: step.id })
        .expect(200);

      expect(res.body.status).toBe('APPROVED');
      expect(res.body.currentStep).toBeNull();
      expect(res.body.history.at(-1)).toMatchObject({
        type: 'APPROVED',
        actor: { id: USERS.amanda },
        stepPosition: 2,
      });
    });

    it('aprovar uma etapa intermediária passa a vez para o próximo aprovador', async () => {
      // PED-011: Amanda → Carlos, aguardando Amanda.
      const step = await currentStepOf(11);
      const res = await api()
        .post('/api/purchase-orders/11/approve')
        .send({ stepId: step.id })
        .expect(200);

      expect(res.body.status).toBe('PENDING');
      expect(res.body.currentStep).toBe(2);
      expect(res.body.steps.map((s: Step) => s.status)).toEqual([
        'APPROVED',
        'PENDING',
      ]);
    });

    it('rejeitar exige motivo (mínimo 10 caracteres)', async () => {
      const step = await currentStepOf(11);
      await api()
        .post('/api/purchase-orders/11/reject')
        .send({ stepId: step.id })
        .expect(400);
      await api()
        .post('/api/purchase-orders/11/reject')
        .send({ stepId: step.id, reason: '   caro   ' })
        .expect(400);
    });

    it('rejeitar encerra o fluxo, marca as etapas seguintes como SKIPPED e grava o motivo', async () => {
      const step = await currentStepOf(11);
      const res = await api()
        .post('/api/purchase-orders/11/reject')
        .send({
          stepId: step.id,
          reason: 'Fornecedor fora da lista de homologados.',
        })
        .expect(200);

      expect(res.body.status).toBe('REJECTED');
      expect(res.body.currentStep).toBeNull();
      expect(res.body.steps.map((s: Step) => s.status)).toEqual([
        'REJECTED',
        'SKIPPED',
      ]);
      expect(res.body.history.at(-1)).toMatchObject({
        type: 'REJECTED',
        actor: { id: USERS.amanda },
        reason: 'Fornecedor fora da lista de homologados.',
      });
    });

    it('etapa que não é mais a atual → 409 STEP_NOT_CURRENT', async () => {
      // PED-008: João e Amanda já aprovaram; a etapa 1 é antiga.
      const { body } = await api().get('/api/purchase-orders/8');
      const oldStep = body.steps[0];

      const res = await api()
        .post('/api/purchase-orders/8/approve')
        .send({ stepId: oldStep.id })
        .expect(409);
      expect(res.body.code).toBe('STEP_NOT_CURRENT');
    });

    it('pedido já decidido → 409 ORDER_ALREADY_DECIDED', async () => {
      // PED-001 está aprovado.
      const { body } = await api().get('/api/purchase-orders/1');
      const res = await api()
        .post('/api/purchase-orders/1/approve')
        .send({ stepId: body.steps[0].id })
        .expect(409);
      expect(res.body.code).toBe('ORDER_ALREADY_DECIDED');
    });

    it('decisões simultâneas na mesma etapa: só uma é aplicada', async () => {
      const step = await currentStepOf(10);

      const responses = await Promise.all(
        Array.from({ length: 5 }, () =>
          api()
            .post('/api/purchase-orders/10/approve')
            .send({ stepId: step.id }),
        ),
      );

      const statuses = responses.map((r) => r.status).sort((a, b) => a - b);
      expect(statuses).toEqual([200, 409, 409, 409, 409]);

      const events = await prisma.purchaseOrderEvent.count({
        where: { orderId: 10, type: 'APPROVED' },
      });
      expect(events).toBe(1);
    });
  });

  describe('cópia da cadeia no pedido', () => {
    it('editar ou remover a faixa não altera pedidos já criados', async () => {
      const before = (await api().get('/api/purchase-orders/9')).body;

      // Faixa 2 do Edifício Maré (id 2 no seed): muda limite e inverte a cadeia; depois remove.
      await api()
        .put('/api/approval-rules/2')
        .send({
          maxAmount: '30000.00',
          approverIds: [USERS.amanda, USERS.joao],
        })
        .expect(200);
      await api().delete('/api/approval-rules/2').expect(204);

      const after = (await api().get('/api/purchase-orders/9')).body;
      expect(after.appliedRule).toEqual(before.appliedRule);
      expect(after.steps).toEqual(before.steps);
    });
  });
});
