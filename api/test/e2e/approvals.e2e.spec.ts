import { api, demoData, item, login } from './helpers.js';

let data: Awaited<ReturnType<typeof demoData>>;
const cookies: Record<string, string> = {};

beforeAll(async () => {
  data = await demoData();
  for (const name of ['Bruno', 'João', 'Amanda', 'Carla']) {
    cookies[name] = await login(data.userId(name));
  }
});

/** A new OB-001 order above R$ 10.000,00: João, then Amanda. */
async function twoStepOrder() {
  const response = await api('POST', '/purchase-orders', {
    cookie: cookies['Bruno'],
    body: {
      siteId: data.siteId('OB-001'),
      supplierId: data.supplierId,
      orderDate: '2026-10-20',
      items: [item('1', '20000')],
    },
  });
  return response.body as { id: string };
}

const approve = (id: string, who: string, version: number) =>
  api('POST', `/purchase-orders/${id}/approve`, {
    cookie: cookies[who],
    body: { version },
  });

const reject = (id: string, who: string, version: number, reason: string) =>
  api('POST', `/purchase-orders/${id}/reject`, {
    cookie: cookies[who],
    body: { version, reason },
  });

describe('approval in chain order', () => {
  it('runs the whole chain and keeps the history', async () => {
    const { id } = await twoStepOrder();

    expect((await approve(id, 'Amanda', 0)).status).toBe(403); // not her turn yet
    expect((await approve(id, 'Carla', 0)).status).toBe(404); // not in the order

    const first = await approve(id, 'João', 0);
    expect(first.status).toBe(200);
    expect(first.body.currentStep).toBe(2);
    expect(first.body.steps.map((s: { status: string }) => s.status)).toEqual([
      'APPROVED',
      'CURRENT',
    ]);

    // A retry of the same decision is not an error.
    const retry = await approve(id, 'João', 0);
    expect(retry.status).toBe(200);
    expect(retry.headers.get('idempotent-replayed')).toBe('true');

    // A decision made on an outdated screen is refused.
    expect((await approve(id, 'Amanda', 0)).status).toBe(409);

    const last = await approve(id, 'Amanda', 1);
    expect(last.body.status).toBe('APPROVED');
    expect(last.body.currentStep).toBeNull();
    expect(last.body.events.map((e: { type: string }) => e.type)).toEqual([
      'CREATED',
      'APPROVED',
      'APPROVED',
      'COMPLETED',
    ]);

    expect((await reject(id, 'Amanda', 2, 'tarde demais')).status).toBe(409);
  });

  it('hides the order from users outside it (404, as if it did not exist)', async () => {
    const { id } = await twoStepOrder();
    expect(
      (await api('GET', `/purchase-orders/${id}`, { cookie: cookies['Carla'] }))
        .status,
    ).toBe(404);
  });
});

describe('rejection', () => {
  it('requires a reason', async () => {
    const { id } = await twoStepOrder();
    const response = await reject(id, 'João', 0, '   ');
    expect(response.status).toBe(400);
    expect(response.body.message).toEqual([
      'reason: informe o motivo da rejeição',
    ]);
  });

  it('stops the flow, cancels the next steps and records the reason', async () => {
    const { id } = await twoStepOrder();
    const { body } = await reject(id, 'João', 0, '  Preço acima do contrato  ');
    expect(body.status).toBe('REJECTED');
    expect(body.steps.map((s: { status: string }) => s.status)).toEqual([
      'REJECTED',
      'CANCELLED',
    ]);
    expect(body.steps[0].reason).toBe('Preço acima do contrato');
    expect(body.events.at(-1)).toMatchObject({
      type: 'REJECTED',
      reason: 'Preço acima do contrato',
    });
  });

  it('treats a retry with the same reason as a repeat, and another reason as a conflict', async () => {
    const { id } = await twoStepOrder();
    await reject(id, 'João', 0, 'Sem orçamento');
    const same = await reject(id, 'João', 0, 'Sem orçamento');
    expect(same.status).toBe(200);
    expect(same.headers.get('idempotent-replayed')).toBe('true');
    const other = await reject(id, 'João', 0, 'Outro motivo');
    expect(other.status).toBe(409);
  });
});

describe('concurrent decisions', () => {
  it('lets only one of approve and reject win', async () => {
    const { id } = await twoStepOrder();
    const statuses = (
      await Promise.all([
        approve(id, 'João', 0),
        reject(id, 'João', 0, 'conflito'),
      ])
    ).map((r) => r.status);
    expect(statuses.sort()).toEqual([200, 409]);
  });

  it('records a double click once', async () => {
    const { id } = await twoStepOrder();
    await Promise.all(Array.from({ length: 6 }, () => approve(id, 'João', 0)));
    const { body } = await api('GET', `/purchase-orders/${id}`, {
      cookie: cookies['João'],
    });
    expect(
      body.events.filter((e: { type: string }) => e.type === 'APPROVED'),
    ).toHaveLength(1);
  });
});

describe('chain snapshot', () => {
  it('keeps the chain of existing orders when a tier changes', async () => {
    const { id } = await twoStepOrder();
    const tiers = (
      await api(
        'GET',
        `/construction-sites/${data.siteId('OB-001')}/approval-tiers`,
      )
    ).body;
    const top = tiers.at(-1);
    const amanda = cookies['Amanda'];

    await api('PUT', `/approval-tiers/${top.id}`, {
      cookie: amanda,
      body: { maxAmount: top.maxAmount, approverIds: [data.userId('Carla')] },
    });
    const { body } = await api('GET', `/purchase-orders/${id}`, {
      cookie: cookies['Bruno'],
    });
    expect(
      body.steps.map(
        (s: { approver: { name: string } }) => s.approver.name.split(' ')[0],
      ),
    ).toEqual(['João', 'Amanda']);

    // Restore the demo rule for the other tests.
    await api('PUT', `/approval-tiers/${top.id}`, {
      cookie: amanda,
      body: {
        maxAmount: top.maxAmount,
        approverIds: top.approvers.map((a: { userId: string }) => a.userId),
      },
    });
  });
});
