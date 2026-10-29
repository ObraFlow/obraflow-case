import { api, demoData, login } from './helpers.js';

let data: Awaited<ReturnType<typeof demoData>>;
let cookie: string;
let site: string;

beforeAll(async () => {
  data = await demoData();
  cookie = await login(data.userId('Amanda'));
  // OB-003 has no tiers in the demo data.
  site = data.siteId('OB-003');
});

const createTier = (body: object, withSession = true) =>
  api('POST', `/construction-sites/${site}/approval-tiers`, {
    body,
    cookie: withSession ? cookie : undefined,
  });

describe('approval tiers', () => {
  it('cannot be changed without a selected user', async () => {
    const response = await createTier(
      { maxAmount: '100.00', approverIds: [data.userId('João')] },
      false,
    );
    expect(response.status).toBe(401);
  });

  it('are created, read, reordered and removed', async () => {
    const created = await createTier({
      maxAmount: '1000',
      approverIds: [data.userId('João'), data.userId('Amanda')],
    });
    expect(created.status).toBe(201);
    expect(created.body.maxAmount).toBe('1000.00');
    const id = created.body.id as string;

    const open = await createTier({
      maxAmount: null,
      approverIds: [data.userId('Carla')],
    });
    expect(open.status).toBe(201);

    const one = await api('GET', `/approval-tiers/${open.body.id}`);
    expect(one.body).toMatchObject({ minAmount: '1000.00', maxAmount: null });

    const list = await api('GET', `/construction-sites/${site}/approval-tiers`);
    expect(
      list.body.map((t: { minAmount: string | null }) => t.minAmount),
    ).toEqual([null, '1000.00']);

    const reordered = await api('PUT', `/approval-tiers/${id}`, {
      cookie,
      body: {
        maxAmount: '1000.00',
        approverIds: [data.userId('Amanda'), data.userId('João')],
      },
    });
    expect(
      reordered.body.approvers.map(
        (a: { user: { name: string } }) => a.user.name.split(' ')[0],
      ),
    ).toEqual(['Amanda', 'João']);

    expect(
      (await api('DELETE', `/approval-tiers/${id}`, { cookie })).status,
    ).toBe(204);
    expect(
      (await api('DELETE', `/approval-tiers/${id}`, { cookie })).status,
    ).toBe(404);
    await api('DELETE', `/approval-tiers/${open.body.id}`, { cookie });
  });

  it('refuses invalid rules', async () => {
    const joao = data.userId('João');
    expect(
      (await createTier({ maxAmount: '0', approverIds: [joao] })).status,
    ).toBe(400);
    expect(
      (await createTier({ maxAmount: '10', approverIds: [] })).status,
    ).toBe(400);
    expect(
      (await createTier({ maxAmount: '10', approverIds: [joao, joao] })).status,
    ).toBe(400);
    expect((await createTier({ approverIds: [joao] })).status).toBe(400); // null must be explicit
  });

  it('allow one tier per limit and one without limit per site', async () => {
    const joao = data.userId('João');
    const first = await createTier({ maxAmount: '500', approverIds: [joao] });
    expect(
      (await createTier({ maxAmount: '500.00', approverIds: [joao] })).status,
    ).toBe(409);
    const open = await createTier({ maxAmount: null, approverIds: [joao] });
    expect(
      (await createTier({ maxAmount: null, approverIds: [joao] })).status,
    ).toBe(409);
    await api('DELETE', `/approval-tiers/${first.body.id}`, { cookie });
    await api('DELETE', `/approval-tiers/${open.body.id}`, { cookie });
  });

  it('preview the chain for an amount', async () => {
    const preview = await api(
      'GET',
      `/construction-sites/${data.siteId('OB-001')}/approval-chain?amount=10000.00`,
    );
    expect(preview.body.tier.maxAmount).toBe('10000.00');
    const none = await api(
      'GET',
      `/construction-sites/${site}/approval-chain?amount=10`,
    );
    expect(none.body.tier).toBeNull();
  });
});

describe('suppliers', () => {
  it('refuse a CNPJ with wrong check digits', async () => {
    const response = await api('POST', '/suppliers', {
      cookie,
      body: { name: 'Fornecedor Teste', taxId: '11.222.333/0001-82' },
    });
    expect(response.status).toBe(400);
    expect(response.body.message).toEqual([
      'taxId: CNPJ inválido (confira os dígitos verificadores)',
    ]);
  });
});
