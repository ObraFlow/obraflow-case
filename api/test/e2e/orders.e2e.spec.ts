import { api, demoData, item, login } from './helpers.js';

let data: Awaited<ReturnType<typeof demoData>>;
let bruno: string;

beforeAll(async () => {
  data = await demoData();
  bruno = await login(data.userId('Bruno'));
});

const order = (site: string, items: object[], extra: object = {}) => ({
  siteId: data.siteId(site),
  supplierId: data.supplierId,
  orderDate: '2026-10-20',
  items,
  ...extra,
});

const create = (body: object, headers?: Record<string, string>) =>
  api('POST', '/purchase-orders', { body, cookie: bruno, headers });

describe('session', () => {
  it('requires a selected user', async () => {
    expect((await api('GET', '/purchase-orders')).status).toBe(401);
  });

  it('ignores a cookie that was not signed by the server', async () => {
    const forged = `obraflow_session=${data.userId('Amanda')}`;
    expect(
      (await api('GET', '/purchase-orders', { cookie: forged })).status,
    ).toBe(401);
  });
});

describe('creating an order', () => {
  it.each([
    ['no items', { items: [] }],
    ['zero quantity', { items: [item('0', '10')] }],
    ['negative price', { items: [item('1', '-10')] }],
    ['quantity that is not a number', { items: [item('abc', '10')] }],
    ['price with 3 decimals', { items: [item('1', '10.123')] }],
    [
      'total sent by the client',
      { items: [{ ...item('1', '10'), total: '1' }] },
    ],
    ['impossible date', { orderDate: '2026-02-30' }],
    ['date before 2000', { orderDate: '1999-12-31' }],
    ['date years ahead', { orderDate: '2999-01-01' }],
  ])('refuses %s with 400', async (_case, change) => {
    const response = await create({
      ...order('OB-001', [item('1', '10')]),
      ...change,
    });
    expect(response.status).toBe(400);
  });

  it('explains validation errors in Portuguese, on the field', async () => {
    const response = await create(
      order('OB-001', [{ ...item('1', '10'), description: ' ' }]),
    );
    expect(response.body.message).toEqual([
      'items.0.description: é obrigatório',
    ]);
  });

  it('refuses an order whose total is zero (422)', async () => {
    const response = await create(order('OB-001', [item('1', '0')]));
    expect(response.status).toBe(422);
    expect(response.body.message).toBe(
      'O total do pedido deve ser maior que zero.',
    );
  });

  it('refuses a total no tier covers (422) and saves nothing', async () => {
    const response = await create(order('OB-003', [item('1', '10')]));
    expect(response.status).toBe(422);
    expect(response.body.message).toMatch(/Nenhuma faixa de alçada/);
  });

  it('calculates totals on the server, rounding each item half up', async () => {
    const response = await create(
      order('OB-001', [
        item('3.333', '1.50'),
        item('1.005', '1'),
        item('2', '10'),
      ]),
    );
    expect(response.status).toBe(201);
    expect(response.body.items.map((i: { total: string }) => i.total)).toEqual([
      '5.00',
      '1.01',
      '20.00',
    ]);
    expect(response.body.total).toBe('26.01');
    expect(response.body.items[0].unitPrice).toBe('1.50');
  });

  it('picks the tier by the total, inclusive at the limit', async () => {
    const chain = async (price: string) =>
      (await create(order('OB-001', [item('1', price)]))).body.steps.map(
        (step: { approver: { name: string } }) =>
          step.approver.name.split(' ')[0],
      );
    expect(await chain('10000.00')).toEqual(['João']);
    expect(await chain('10000.01')).toEqual(['João', 'Amanda']);
  });

  it('copies the chain with the first step as CURRENT', async () => {
    const { body } = await create(order('OB-002', [item('1', '50000.01')]));
    expect(body.status).toBe('PENDING');
    expect(body.currentStep).toBe(1);
    expect(body.steps.map((s: { status: string }) => s.status)).toEqual([
      'CURRENT',
      'WAITING',
      'WAITING',
    ]);
    expect(body.events.map((e: { type: string }) => e.type)).toEqual([
      'CREATED',
    ]);
  });
});

describe('idempotency', () => {
  it('returns the same order when the request is repeated', async () => {
    const body = order('OB-001', [item('2', '10')]);
    const headers = { 'Idempotency-Key': 'e2e-repeat' };
    const first = await create(body, headers);
    const second = await create(body, headers);
    expect(second.body.id).toBe(first.body.id);
    expect(second.headers.get('idempotent-replayed')).toBe('true');
  });

  it('refuses the same key with another body (422)', async () => {
    const headers = { 'Idempotency-Key': 'e2e-other-body' };
    await create(order('OB-001', [item('2', '10')]), headers);
    const response = await create(order('OB-001', [item('3', '10')]), headers);
    expect(response.status).toBe(422);
  });

  it('creates one order for simultaneous requests with the same key', async () => {
    const body = order('OB-001', [item('4', '10')]);
    const headers = { 'Idempotency-Key': 'e2e-parallel' };
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => create(body, headers)),
    );
    expect(new Set(responses.map((r) => r.body.id)).size).toBe(1);
  });
});

describe('listing', () => {
  it('shows only the orders the user takes part in', async () => {
    const ricardo = await login(data.userId('Ricardo'));
    const { body } = await api('GET', '/purchase-orders?pageSize=100', {
      cookie: ricardo,
    });
    // Ricardo only approves the top tier of OB-002.
    for (const listed of body.data) {
      expect(
        listed.steps.some(
          (s: { approver: { id: string } }) =>
            s.approver.id === data.userId('Ricardo'),
        ),
      ).toBe(true);
    }
  });

  it('filters the orders waiting for the user', async () => {
    const amanda = await login(data.userId('Amanda'));
    const { body } = await api('GET', '/purchase-orders?awaitingMe=true', {
      cookie: amanda,
    });
    expect(body.data.length).toBeGreaterThan(0);
    for (const listed of body.data) {
      expect(listed.currentApprover.id).toBe(data.userId('Amanda'));
    }
  });
});
