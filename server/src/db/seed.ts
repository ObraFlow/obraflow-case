import { db } from './client.js'
import { sites, suppliers, users } from './schema.js'
import { createTier } from '../modules/tiers.js'
import { createOrder, decide } from '../modules/orders/service.js'
import { createOrderBody } from '../modules/orders/schemas.js'

type RawItem = { description: string; quantity: string; unit: string; unitPriceCents: number }

// Datas relativas a hoje, para a demonstração sempre ter pedidos recentes,
// pedidos parados há dias e aprovações dentro do mês.
const ago = (days: number, hours = 0) => new Date(Date.now() - (days * 24 + hours) * 3_600_000).toISOString()
const dateOf = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Usa os mesmos serviços da API, então os dados de demonstração passam
// pelas mesmas regras (cálculo de total, escolha da faixa, ordem da cadeia).
export function seed({ history = true }: { history?: boolean } = {}) {
  const [pedro, joao, amanda, carla, ricardo, beatriz] = db
    .insert(users)
    .values([
      { name: 'Pedro Santana', email: 'pedro@obraflow.dev', role: 'Comprador', phone: '5571999990001' },
      { name: 'João Menezes', email: 'joao@obraflow.dev', role: 'Engenheiro residente', phone: '5571999990002' },
      { name: 'Amanda Ribeiro', email: 'amanda@obraflow.dev', role: 'Gerente de obras', phone: '5571999990003' },
      { name: 'Carla Nunes', email: 'carla@obraflow.dev', role: 'Diretora financeira', phone: '5571999990004' },
      { name: 'Ricardo Teles', email: 'ricardo@obraflow.dev', role: 'Sócio-diretor', phone: '5571999990005' },
      { name: 'Beatriz Moura', email: 'beatriz@obraflow.dev', role: 'Engenheira residente', phone: '5575999990006' },
    ])
    .returning()
    .all()

  const [mirante, horizonte] = db
    .insert(sites)
    .values([
      { code: 'OB-101', name: 'Residencial Mirante do Vale', city: 'Salvador, BA', kind: 'residential', budgetCents: 450_000_00 },
      { code: 'OB-102', name: 'Edifício Corporativo Horizonte', city: 'Feira de Santana, BA', kind: 'commercial', budgetCents: 140_000_00 },
      // sem regras de propósito: mostra o bloqueio de envio na tela de pedido
      { code: 'OB-103', name: 'Galpão Logístico BR-324', city: 'Simões Filho, BA', kind: 'industrial', budgetCents: 1_200_000_00 },
    ])
    .returning()
    .all()

  const [aco, concreto, eletrica, madeira, andaime] = db
    .insert(suppliers)
    .values([
      { name: 'Aço Forte Distribuidora Ltda', cnpj: '12345678000190' },
      { name: 'Concreto Recôncavo Usinados S.A.', cnpj: '23456789000101' },
      { name: 'Elétrica Nordeste Materiais', cnpj: '34567890000112' },
      { name: 'Madeireira Itapuã', cnpj: '45678901000123' },
      { name: 'Andaime Seguro Locações', cnpj: '56789012000134' },
    ])
    .returning()
    .all()

  // OB-101: o exemplo do enunciado, com uma terceira faixa para compras grandes
  createTier(mirante.id, { upToCents: 10_000_00, approverIds: [joao.id] })
  createTier(mirante.id, { upToCents: 100_000_00, approverIds: [joao.id, amanda.id] })
  createTier(mirante.id, { upToCents: null, approverIds: [joao.id, amanda.id, ricardo.id] })

  // OB-102: sem faixa "acima de". Pedidos acima de R$ 50 mil são barrados.
  createTier(horizonte.id, { upToCents: 5_000_00, approverIds: [beatriz.id] })
  createTier(horizonte.id, { upToCents: 50_000_00, approverIds: [beatriz.id, carla.id] })

  type Extra = { notes?: string; resubmissionOfId?: number }
  const order = (siteId: number, supplierId: number, at: string, items: RawItem[], extra: Extra = {}) =>
    createOrder(createOrderBody.parse({ siteId, supplierId, orderDate: dateOf(at), items, ...extra }), pedro.id, { at })
  const approve = (id: number, by: number, at: string) => decide(id, by, { type: 'APPROVE' }, { at })

  // 1. Pequeno, aprovado direto pelo João
  const o1 = order(mirante.id, madeira.id, ago(18, 3), [
    { description: 'Tábua de pinus 30 cm x 3 m', quantity: '40', unit: 'un', unitPriceCents: 38_90 },
    { description: 'Pontalete de eucalipto 3 m', quantity: '60', unit: 'un', unitPriceCents: 22_50 },
  ])
  approve(o1.id, joao.id, ago(17, 20))

  // 2. Médio: João aprovou há 6 dias e está parado com a Amanda
  const o2 = order(
    mirante.id,
    aco.id,
    ago(9, 4),
    [
      { description: 'Vergalhão CA-50 10 mm (barra 12 m)', quantity: '320', unit: 'un', unitPriceCents: 54_80 },
      { description: 'Arame recozido 18', quantity: '45.5', unit: 'kg', unitPriceCents: 16_90 },
    ],
    { notes: 'Reposição para a laje do 4º pavimento. Preço fechado até sexta.' },
  )
  approve(o2.id, joao.id, ago(6, 2))

  // 3. Grande, cadeia de 3, ainda no primeiro nível
  order(
    mirante.id,
    concreto.id,
    ago(1, 22),
    [
      { description: 'Concreto usinado fck 30 MPa, bombeado', quantity: '210', unit: 'm³', unitPriceCents: 545_00 },
      { description: 'Taxa de bombeamento', quantity: '7', unit: 'vb', unitPriceCents: 1_850_00 },
    ],
    { notes: 'Concretagem das lajes 5 a 7.' },
  )

  // 4. Rejeitado pela Amanda no segundo nível...
  const o4 = order(mirante.id, andaime.id, ago(12, 5), [
    { description: 'Locação de andaime fachadeiro (30 dias)', quantity: '850', unit: 'm²', unitPriceCents: 18_40 },
  ])
  approve(o4.id, joao.id, ago(11, 6))
  decide(
    o4.id,
    amanda.id,
    { type: 'REJECT', reason: 'Metragem acima do projeto: a fachada leste tem 620 m², não 850. Corrigir e reenviar.' },
    { at: ago(10, 1) },
  )

  // ...e reenviado corrigido pelo Pedro
  order(
    mirante.id,
    andaime.id,
    ago(0, 20),
    [{ description: 'Locação de andaime fachadeiro (30 dias)', quantity: '620', unit: 'm²', unitPriceCents: 18_40 }],
    { notes: 'Metragem corrigida conforme projeto da fachada leste.', resubmissionOfId: o4.id },
  )

  // 5. OB-102, parado com a Beatriz há 4 dias
  order(horizonte.id, eletrica.id, ago(4, 3), [
    { description: 'Cabo flexível 2,5 mm² (rolo 100 m)', quantity: '18', unit: 'un', unitPriceCents: 289_90 },
    { description: 'Disjuntor DIN bipolar 32 A', quantity: '24', unit: 'un', unitPriceCents: 74_50 },
    { description: 'Eletroduto corrugado 1"', quantity: '300', unit: 'm', unitPriceCents: 3_20 },
  ])

  // 6. OB-102, aprovado pela cadeia completa (Beatriz → Carla)
  const o6 = order(horizonte.id, aco.id, ago(16, 6), [
    { description: 'Perfil metálico W 200 x 26,6', quantity: '1750', unit: 'kg', unitPriceCents: 12_40 },
  ])
  approve(o6.id, beatriz.id, ago(15, 8))
  approve(o6.id, carla.id, ago(14, 3))

  // 7. OB-102, pequeno, chegou hoje
  order(horizonte.id, madeira.id, ago(0, 3), [
    { description: 'Compensado naval 18 mm', quantity: '12', unit: 'un', unitPriceCents: 189_00 },
  ])

  if (!history) return

  // Compras dos meses anteriores, já aprovadas pela cadeia inteira, para o painel
  // ter série histórica. Vêm depois dos pedidos acima para não mudar os ids 1 a 8.
  const chain = (siteId: number, cents: number) =>
    siteId === mirante.id ? (cents <= 10_000_00 ? [joao] : [joao, amanda]) : cents <= 5_000_00 ? [beatriz] : [beatriz, carla]
  const past: Array<[number, number, number, string, string, string, number]> = [
    // [obra, fornecedor, dias atrás, descrição, quantidade, unidade, preço unitário]
    [mirante.id, concreto.id, 168, 'Concreto usinado fck 25 MPa (fundação)', '96', 'm³', 498_00],
    [mirante.id, aco.id, 160, 'Vergalhão CA-50 12,5 mm (barra 12 m)', '540', 'un', 82_40],
    [horizonte.id, madeira.id, 150, 'Forma de compensado plastificado 18 mm', '140', 'un', 168_00],
    [mirante.id, andaime.id, 132, 'Locação de andaime tubular (30 dias)', '420', 'm²', 17_90],
    [horizonte.id, concreto.id, 124, 'Concreto usinado fck 30 MPa (blocos)', '68', 'm³', 535_00],
    [mirante.id, eletrica.id, 101, 'Quadro de distribuição 24 disjuntores', '6', 'un', 1_240_00],
    [horizonte.id, aco.id, 95, 'Perfil metálico U 150 x 50', '980', 'kg', 11_80],
    [mirante.id, concreto.id, 74, 'Concreto usinado fck 30 MPa (pilares)', '84', 'm³', 529_00],
    [mirante.id, madeira.id, 66, 'Tábua de pinus 30 cm x 3 m', '220', 'un', 37_50],
    [horizonte.id, eletrica.id, 58, 'Cabo flexível 4 mm² (rolo 100 m)', '22', 'un', 412_00],
    [mirante.id, aco.id, 44, 'Tela soldada Q-138 (painel 2 x 3 m)', '160', 'un', 118_00],
    [horizonte.id, andaime.id, 38, 'Locação de balancim elétrico (30 dias)', '4', 'un', 2_350_00],
    [mirante.id, concreto.id, 34, 'Argamassa estabilizada', '42', 'm³', 389_00],
  ]
  for (const [siteId, supplierId, days, description, quantity, unit, unitPriceCents] of past) {
    const created = order(siteId, supplierId, ago(days, 4), [{ description, quantity, unit, unitPriceCents }])
    chain(siteId, created.totalCents).forEach((u, i) => approve(created.id, u.id, ago(days - 1 - i, 2)))
  }
}
