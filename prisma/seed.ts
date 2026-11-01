// Dados de demonstração. Rodar com `npm run db:seed` (prisma db seed → tsx prisma/seed.ts; o CLI carrega o .env).
// Apaga tudo e recria, com ids reiniciados, para a demo sempre começar igual.
//
// As datas são relativas ao dia em que o seed roda: idade "há N dias", atraso, "aprovados
// no mês" e a série dos últimos seis meses dependem do hoje, e um seed de datas fixas
// envelheceria em uma semana. Os ids, valores e situações são sempre os mesmos.
//
// O que fica no banco ao final:
//   2 obras (com orçamento), 5 usuários, 4 fornecedores
//   Residencial: até R$ 10 mil → João; acima → Amanda (que acumula com João antes)
//   Galpão: até R$ 30 mil → Carla → Beatriz; acima de R$ 50 mil → Amanda (cadeia de 3 níveis);
//           entre R$ 30.000,01 e R$ 50.000,00 não há faixa, de propósito (lacuna visível em /regras)
//   #1–#9: todas as situações (pendente no 1º e no 2º nível, atrasado, aprovado com 1, 2 e 3
//          níveis, rejeitado, rejeitado e refeito, rejeitado sem nova versão)
//   #10–#21: compras aprovadas nos cinco meses anteriores, para a série mensal e o ranking de fornecedores
//   O Residencial fica com ~92% do orçamento comprometido (aviso "Quase no limite").

import { calcularTotais } from "../src/domain/pedido/calcularTotais";
import { prisma } from "../src/server/prisma";

// --- Datas relativas ---------------------------------------------------------

const AGORA = new Date();
const DIA_MS = 86_400_000;

/** `dias` atrás, na hora `horaUtc` (9h em Brasília = 12h UTC, de propósito: o mês é o mesmo nos dois fusos). */
function diasAtras(dias: number, horaUtc = 12): Date {
  const data = new Date(AGORA.getTime() - dias * DIA_MS);
  data.setUTCHours(horaUtc, 0, 0, 0);
  return data;
}

/** `meses` atrás, no dia `dia` do mês (entre 3 e 26 para não cair fora do mês em nenhum fuso). */
function mesesAtras(meses: number, dia: number, horaUtc = 12): Date {
  const indice = AGORA.getUTCFullYear() * 12 + AGORA.getUTCMonth() - meses;
  return new Date(Date.UTC(Math.floor(indice / 12), indice % 12, dia, horaUtc));
}

/** `dataPedido` é `@db.Date`: só a data, à meia-noite UTC. */
function soData(instante: Date): Date {
  return new Date(instante.toISOString().slice(0, 10));
}

// --- Pedidos -----------------------------------------------------------------

type ItemSeed = {
  descricao: string;
  quantidade: string;
  unidade: string;
  precoUnitarioCents: number;
};

type NivelSeed = {
  aprovadorId: number;
  status?: "APROVADA" | "REJEITADA" | "CANCELADA";
  decididoEm?: Date;
  motivo?: string;
};

type PedidoSeed = {
  obraId: number;
  fornecedorId: number;
  criadoPorId: number;
  regraId: number;
  criadoEm: Date;
  itens: ItemSeed[];
  /** A cadeia copiada para o pedido, na ordem. Nível sem `status` fica PENDENTE. */
  cadeia: NivelSeed[];
  observacoes?: string;
  origemId?: number;
};

/**
 * Cria um pedido com totais calculados pelo domínio (o mesmo `calcularTotais` do
 * `criarPedido`) e status/stepAtual derivados da cadeia, como ficariam depois das decisões.
 */
async function criarPedidoSeed(pedido: PedidoSeed) {
  const { totaisItensCents, totalPedidoCents } = calcularTotais(pedido.itens);
  const itens = pedido.itens.map((item, indice) => ({
    ordem: indice,
    descricao: item.descricao,
    quantidade: item.quantidade,
    unidade: item.unidade,
    precoUnitarioCents: item.precoUnitarioCents,
    totalCents: totaisItensCents[indice],
  }));

  const rejeitadoEm = pedido.cadeia.findIndex((nivel) => nivel.status === "REJEITADA");
  const primeiroPendente = pedido.cadeia.findIndex((nivel) => nivel.status === undefined);
  const status =
    rejeitadoEm !== -1 ? "REJEITADO" : primeiroPendente === -1 ? "APROVADO" : "PENDENTE";
  const stepAtual =
    status === "REJEITADO"
      ? rejeitadoEm
      : status === "APROVADO"
        ? pedido.cadeia.length
        : primeiroPendente;

  return prisma.pedido.create({
    data: {
      obraId: pedido.obraId,
      fornecedorId: pedido.fornecedorId,
      criadoPorId: pedido.criadoPorId,
      regraId: pedido.regraId,
      origemId: pedido.origemId,
      dataPedido: soData(pedido.criadoEm),
      criadoEm: pedido.criadoEm,
      observacoes: pedido.observacoes,
      totalCents: totalPedidoCents,
      status,
      stepAtual,
      itens: { create: itens },
      aprovacoes: {
        create: pedido.cadeia.map((nivel, ordem) => ({
          ordem,
          aprovadorId: nivel.aprovadorId,
          status: nivel.status ?? "PENDENTE",
          decididoEm: nivel.decididoEm,
          motivo: nivel.motivo,
        })),
      },
    },
    select: { id: true },
  });
}

async function limparBanco() {
  // TRUNCATE com CASCADE respeita as FKs e RESTART IDENTITY zera os autoincrements.
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "AprovacaoPedido", "ItemPedido", "Pedido", "NivelRegra", "RegraAlcada", "Fornecedor", "Usuario", "Obra" RESTART IDENTITY CASCADE`,
  );
}

async function main() {
  await limparBanco();

  // --- Cadastros -----------------------------------------------------------

  const residencial = await prisma.obra.create({
    data: { nome: "Residencial Jardim das Acácias", orcamentoCents: 15_000_000 },
  });
  const galpao = await prisma.obra.create({
    data: { nome: "Galpão Logístico BR-324", orcamentoCents: 100_000_000 },
  });

  const joao = await prisma.usuario.create({
    data: {
      nome: "João Mendes",
      email: "joao.mendes@obraflow.local",
      cargo: "Engenheiro residente",
    },
  });
  const amanda = await prisma.usuario.create({
    data: {
      nome: "Amanda Ribeiro",
      email: "amanda.ribeiro@obraflow.local",
      cargo: "Diretora de operações",
    },
  });
  const carla = await prisma.usuario.create({
    data: {
      nome: "Carla Souza",
      email: "carla.souza@obraflow.local",
      cargo: "Coordenadora de suprimentos",
    },
  });
  const beatriz = await prisma.usuario.create({
    data: {
      nome: "Beatriz Costa",
      email: "beatriz.costa@obraflow.local",
      cargo: "Gerente financeira",
    },
  });
  const rafael = await prisma.usuario.create({
    data: { nome: "Rafael Lima", email: "rafael.lima@obraflow.local", cargo: "Mestre de obras" },
  });

  const cimentos = await prisma.fornecedor.create({
    data: { nome: "Cimentos Bahia Ltda", cnpj: "12.345.678/0001-90" },
  });
  const ferragens = await prisma.fornecedor.create({
    data: { nome: "Ferragens Nordeste S.A.", cnpj: "98.765.432/0001-10" },
  });
  const madeiras = await prisma.fornecedor.create({
    data: { nome: "Madeiras do Recôncavo Ltda", cnpj: "45.678.912/0001-33" },
  });
  const eletrica = await prisma.fornecedor.create({
    data: { nome: "Elétrica Baiana Materiais Ltda", cnpj: "23.456.789/0001-57" },
  });

  // --- Regras de alçada -----------------------------------------------------

  // Residencial: até R$ 10.000,00 só o engenheiro residente; acima, a diretora entra depois dele.
  // A cadeia acumula (decisão 1): a faixa alta cadastra só a Amanda, e a cadeia efetiva de um
  // pedido acima de 10 mil é João (herdado da faixa baixa) e depois Amanda.
  const faixaBaixaResidencial = await prisma.regraAlcada.create({
    data: {
      obraId: residencial.id,
      minCents: 0,
      maxCents: 1_000_000,
      niveis: { create: [{ ordem: 0, usuarioId: joao.id }] },
    },
  });
  const faixaAltaResidencial = await prisma.regraAlcada.create({
    data: {
      obraId: residencial.id,
      minCents: 1_000_001,
      maxCents: null,
      niveis: { create: [{ ordem: 0, usuarioId: amanda.id }] },
    },
  });

  // Galpão: até R$ 30 mil passa por suprimentos e depois pelo financeiro; acima de R$ 50 mil a
  // diretora decide por último (cadeia de três níveis). Entre os dois não há faixa, de propósito:
  // a tela de regras mostra a lacuna e o cadastro de um pedido nesse valor é bloqueado.
  const faixaBaixaGalpao = await prisma.regraAlcada.create({
    data: {
      obraId: galpao.id,
      minCents: 0,
      maxCents: 3_000_000,
      niveis: {
        create: [
          { ordem: 0, usuarioId: carla.id },
          { ordem: 1, usuarioId: beatriz.id },
        ],
      },
    },
  });
  const faixaAltaGalpao = await prisma.regraAlcada.create({
    data: {
      obraId: galpao.id,
      minCents: 5_000_001,
      maxCents: null,
      niveis: { create: [{ ordem: 0, usuarioId: amanda.id }] },
    },
  });

  // --- Pedidos do mês: todas as situações -----------------------------------
  // A cadeia (aprovacoes) é a cópia dos níveis da faixa no momento da criação.

  // #1 — Residencial, R$ 7.800,00: faixa baixa, só João. Pendente há 2 dias (ainda não atrasado).
  await criarPedidoSeed({
    obraId: residencial.id,
    fornecedorId: cimentos.id,
    criadoPorId: rafael.id,
    regraId: faixaBaixaResidencial.id,
    criadoEm: diasAtras(2, 12),
    observacoes: "Reposição de estoque para a concretagem da laje do bloco B.",
    itens: [
      {
        descricao: "Cimento CP-II 50 kg",
        quantidade: "150",
        unidade: "sc",
        precoUnitarioCents: 3_490,
      },
      {
        descricao: "Areia média lavada",
        quantidade: "12",
        unidade: "m³",
        precoUnitarioCents: 14_500,
      },
      { descricao: "Brita 1", quantidade: "5", unidade: "m³", precoUnitarioCents: 16_500 },
    ],
    cadeia: [{ aprovadorId: joao.id }],
  });

  // #2 — Residencial, R$ 25.200,00: faixa alta, João → Amanda. João aprovou ontem; pendente com a Amanda.
  await criarPedidoSeed({
    obraId: residencial.id,
    fornecedorId: cimentos.id,
    criadoPorId: rafael.id,
    regraId: faixaAltaResidencial.id,
    criadoEm: diasAtras(4, 13),
    observacoes: "Concretagem da laje do 3º pavimento, bloco A. Bombeamento incluso.",
    itens: [
      {
        descricao: "Concreto usinado fck 25 MPa",
        quantidade: "60",
        unidade: "m³",
        precoUnitarioCents: 42_000,
      },
    ],
    cadeia: [
      { aprovadorId: joao.id, status: "APROVADA", decididoEm: diasAtras(1, 17) },
      { aprovadorId: amanda.id },
    ],
  });

  // #3 — Residencial, R$ 2.352,00: faixa baixa, João aprovou no mesmo dia. Cadeia de 1 nível concluída.
  await criarPedidoSeed({
    obraId: residencial.id,
    fornecedorId: ferragens.id,
    criadoPorId: rafael.id,
    regraId: faixaBaixaResidencial.id,
    criadoEm: diasAtras(16, 11),
    itens: [
      {
        descricao: "Prego 18x27 com cabeça",
        quantidade: "30",
        unidade: "kg",
        precoUnitarioCents: 1_890,
      },
      {
        descricao: "Arame recozido nº 18",
        quantidade: "50",
        unidade: "kg",
        precoUnitarioCents: 1_650,
      },
      {
        descricao: "Disco de corte 7 pol.",
        quantidade: "40",
        unidade: "un",
        precoUnitarioCents: 2_400,
      },
    ],
    cadeia: [{ aprovadorId: joao.id, status: "APROVADA", decididoEm: diasAtras(16, 20) }],
  });

  // #4 — Galpão, R$ 28.920,00: faixa baixa, Carla → Beatriz, ambas aprovaram. Cadeia de 2 níveis concluída.
  await criarPedidoSeed({
    obraId: galpao.id,
    fornecedorId: ferragens.id,
    criadoPorId: rafael.id,
    regraId: faixaBaixaGalpao.id,
    criadoEm: diasAtras(22, 18),
    observacoes: "Estrutura da cobertura, módulo 1.",
    itens: [
      { descricao: "Aço CA-50 10 mm", quantidade: "2400", unidade: "kg", precoUnitarioCents: 890 },
      {
        descricao: "Telha metálica trapezoidal 0,5 mm",
        quantidade: "40",
        unidade: "un",
        precoUnitarioCents: 18_900,
      },
    ],
    cadeia: [
      { aprovadorId: carla.id, status: "APROVADA", decididoEm: diasAtras(21, 14) },
      { aprovadorId: beatriz.id, status: "APROVADA", decididoEm: diasAtras(18, 12) },
    ],
  });

  // #5 — Residencial, R$ 16.800,00: faixa alta, João → Amanda. João rejeitou com motivo; Amanda nunca decidiu.
  const rejeitado = await criarPedidoSeed({
    obraId: residencial.id,
    fornecedorId: ferragens.id,
    criadoPorId: rafael.id,
    regraId: faixaAltaResidencial.id,
    criadoEm: diasAtras(10, 16),
    observacoes: "Revestimento das áreas comuns.",
    itens: [
      {
        descricao: "Porcelanato 60x60 acetinado",
        quantidade: "240",
        unidade: "m²",
        precoUnitarioCents: 7_000,
      },
    ],
    cadeia: [
      {
        aprovadorId: joao.id,
        status: "REJEITADA",
        decididoEm: diasAtras(9, 11),
        motivo:
          "Quantidade acima do previsto no orçamento desta etapa. Revisar o quantitativo com o almoxarifado.",
      },
      { aprovadorId: amanda.id, status: "CANCELADA" },
    ],
  });

  // #6 — Galpão, R$ 62.000,00: faixa alta, Carla → Beatriz → Amanda. Carla aprovou; pendente no 2º nível.
  await criarPedidoSeed({
    obraId: galpao.id,
    fornecedorId: ferragens.id,
    criadoPorId: rafael.id,
    regraId: faixaAltaGalpao.id,
    criadoEm: diasAtras(3, 12),
    observacoes: "Fechamento lateral do módulo 2. Entrega em duas remessas.",
    itens: [
      {
        descricao: "Telha termoacústica 30 mm",
        quantidade: "200",
        unidade: "un",
        precoUnitarioCents: 31_000,
      },
    ],
    cadeia: [
      { aprovadorId: carla.id, status: "APROVADA", decididoEm: diasAtras(2, 15) },
      { aprovadorId: beatriz.id },
      { aprovadorId: amanda.id },
    ],
  });

  // #7 — Residencial, R$ 4.300,00: faixa baixa, só João. Sem decisão há 6 dias: atrasado.
  await criarPedidoSeed({
    obraId: residencial.id,
    fornecedorId: eletrica.id,
    criadoPorId: rafael.id,
    regraId: faixaBaixaResidencial.id,
    criadoEm: diasAtras(6, 10),
    observacoes: "Iluminação provisória do canteiro para o turno da noite.",
    itens: [
      {
        descricao: "Luminária LED de canteiro 100 W",
        quantidade: "20",
        unidade: "un",
        precoUnitarioCents: 21_500,
      },
    ],
    cadeia: [{ aprovadorId: joao.id }],
  });

  // #8 — Residencial, R$ 14.000,00: nova versão do #5 com o quantitativo revisado. João → Amanda, pendente com João.
  await criarPedidoSeed({
    obraId: residencial.id,
    fornecedorId: ferragens.id,
    criadoPorId: rafael.id,
    regraId: faixaAltaResidencial.id,
    criadoEm: diasAtras(1, 9),
    origemId: rejeitado.id,
    observacoes: "Revestimento das áreas comuns. Quantitativo conferido com o almoxarifado.",
    itens: [
      {
        descricao: "Porcelanato 60x60 acetinado",
        quantidade: "200",
        unidade: "m²",
        precoUnitarioCents: 7_000,
      },
    ],
    cadeia: [{ aprovadorId: joao.id }, { aprovadorId: amanda.id }],
  });

  // #9 — Galpão, R$ 8.900,00: faixa baixa, Carla rejeitou há 3 dias. Ainda sem nova versão.
  await criarPedidoSeed({
    obraId: galpao.id,
    fornecedorId: madeiras.id,
    criadoPorId: rafael.id,
    regraId: faixaBaixaGalpao.id,
    criadoEm: diasAtras(4, 14),
    observacoes: "Portão de acesso ao pátio de manobra.",
    itens: [
      {
        descricao: "Portão de correr em madeira 4 m",
        quantidade: "1",
        unidade: "un",
        precoUnitarioCents: 890_000,
      },
    ],
    cadeia: [
      {
        aprovadorId: carla.id,
        status: "REJEITADA",
        decididoEm: diasAtras(3, 10),
        motivo: "O pátio terá portão metálico pelo contrato da estrutura. Cancelar esta compra.",
      },
      { aprovadorId: beatriz.id, status: "CANCELADA" },
    ],
  });

  // --- Compras dos meses anteriores: série mensal e ranking de fornecedores ---
  // Cada compra é aprovada por inteiro `mesesAtras(m, dia)`; os níveis anteriores decidem
  // um dia antes do seguinte, e o pedido é criado três dias antes da última aprovação.

  type Historico = {
    obraId: number;
    regraId: number;
    fornecedorId: number;
    aprovadores: number[];
    mesesAtras: number;
    dia: number;
    item: ItemSeed;
  };

  const historico: Historico[] = [
    // Residencial (João; acima de R$ 10 mil, João → Amanda)
    {
      obraId: residencial.id,
      regraId: faixaAltaResidencial.id,
      fornecedorId: cimentos.id,
      aprovadores: [joao.id, amanda.id],
      mesesAtras: 1,
      dia: 8,
      item: {
        descricao: "Cimento CP-II 50 kg",
        quantidade: "500",
        unidade: "sc",
        precoUnitarioCents: 3_700,
      },
    },
    {
      obraId: residencial.id,
      regraId: faixaBaixaResidencial.id,
      fornecedorId: madeiras.id,
      aprovadores: [joao.id],
      mesesAtras: 1,
      dia: 20,
      item: {
        descricao: "Chapa de madeira para forma 18 mm",
        quantidade: "160",
        unidade: "un",
        precoUnitarioCents: 6_000,
      },
    },
    {
      obraId: residencial.id,
      regraId: faixaAltaResidencial.id,
      fornecedorId: eletrica.id,
      aprovadores: [joao.id, amanda.id],
      mesesAtras: 2,
      dia: 5,
      item: {
        descricao: "Fio flexível 2,5 mm² rolo 100 m",
        quantidade: "95",
        unidade: "un",
        precoUnitarioCents: 16_000,
      },
    },
    {
      obraId: residencial.id,
      regraId: faixaBaixaResidencial.id,
      fornecedorId: cimentos.id,
      aprovadores: [joao.id],
      mesesAtras: 2,
      dia: 17,
      item: {
        descricao: "Argamassa AC-II 20 kg",
        quantidade: "400",
        unidade: "sc",
        precoUnitarioCents: 1_850,
      },
    },
    {
      obraId: residencial.id,
      regraId: faixaAltaResidencial.id,
      fornecedorId: ferragens.id,
      aprovadores: [joao.id, amanda.id],
      mesesAtras: 3,
      dia: 10,
      item: {
        descricao: "Aço CA-50 8 mm",
        quantidade: "1500",
        unidade: "kg",
        precoUnitarioCents: 860,
      },
    },
    {
      obraId: residencial.id,
      regraId: faixaAltaResidencial.id,
      fornecedorId: madeiras.id,
      aprovadores: [joao.id, amanda.id],
      mesesAtras: 4,
      dia: 12,
      item: {
        descricao: "Tábua de pinus 30 cm",
        quantidade: "226",
        unidade: "un",
        precoUnitarioCents: 5_000,
      },
    },
    {
      obraId: residencial.id,
      regraId: faixaBaixaResidencial.id,
      fornecedorId: eletrica.id,
      aprovadores: [joao.id],
      mesesAtras: 5,
      dia: 9,
      item: {
        descricao: "Quadro de distribuição 24 disjuntores",
        quantidade: "8",
        unidade: "un",
        precoUnitarioCents: 115_000,
      },
    },
    // Galpão (Carla → Beatriz; acima de R$ 50 mil, Carla → Beatriz → Amanda)
    {
      obraId: galpao.id,
      regraId: faixaAltaGalpao.id,
      fornecedorId: ferragens.id,
      aprovadores: [carla.id, beatriz.id, amanda.id],
      mesesAtras: 1,
      dia: 14,
      item: {
        descricao: "Viga metálica W 200x15",
        quantidade: "40",
        unidade: "un",
        precoUnitarioCents: 170_000,
      },
    },
    {
      obraId: galpao.id,
      regraId: faixaBaixaGalpao.id,
      fornecedorId: cimentos.id,
      aprovadores: [carla.id, beatriz.id],
      mesesAtras: 2,
      dia: 9,
      item: {
        descricao: "Bloco de concreto 14x19x39",
        quantidade: "7000",
        unidade: "un",
        precoUnitarioCents: 320,
      },
    },
    {
      obraId: galpao.id,
      regraId: faixaBaixaGalpao.id,
      fornecedorId: eletrica.id,
      aprovadores: [carla.id, beatriz.id],
      mesesAtras: 3,
      dia: 4,
      item: {
        descricao: "Cabo de cobre 16 mm²",
        quantidade: "150",
        unidade: "m",
        precoUnitarioCents: 6_500,
      },
    },
    {
      obraId: galpao.id,
      regraId: faixaBaixaGalpao.id,
      fornecedorId: madeiras.id,
      aprovadores: [carla.id, beatriz.id],
      mesesAtras: 4,
      dia: 22,
      item: {
        descricao: "Chapa compensada naval 20 mm",
        quantidade: "210",
        unidade: "un",
        precoUnitarioCents: 13_000,
      },
    },
    {
      obraId: galpao.id,
      regraId: faixaBaixaGalpao.id,
      fornecedorId: ferragens.id,
      aprovadores: [carla.id, beatriz.id],
      mesesAtras: 5,
      dia: 15,
      item: {
        descricao: "Tubo PVC esgoto 100 mm 6 m",
        quantidade: "400",
        unidade: "un",
        precoUnitarioCents: 3_700,
      },
    },
  ];

  for (const compra of historico) {
    const aprovacaoFinal = mesesAtras(compra.mesesAtras, compra.dia);
    const ultimo = compra.aprovadores.length - 1;
    await criarPedidoSeed({
      obraId: compra.obraId,
      fornecedorId: compra.fornecedorId,
      criadoPorId: rafael.id,
      regraId: compra.regraId,
      criadoEm: new Date(aprovacaoFinal.getTime() - 3 * DIA_MS),
      itens: [compra.item],
      cadeia: compra.aprovadores.map((aprovadorId, ordem) => ({
        aprovadorId,
        status: "APROVADA",
        decididoEm: new Date(aprovacaoFinal.getTime() - (ultimo - ordem) * DIA_MS),
      })),
    });
  }

  const resumo = await prisma.pedido.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      status: true,
      stepAtual: true,
      totalCents: true,
      origemId: true,
      criadoEm: true,
      obra: { select: { nome: true } },
    },
  });
  console.table(
    resumo.map((p) => ({
      id: p.id,
      status: p.status,
      step: p.stepAtual,
      totalCents: p.totalCents,
      origem: p.origemId ?? "",
      criadoEm: p.criadoEm.toISOString().slice(0, 10),
      obra: p.obra.nome,
    })),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (erro) => {
    console.error(erro);
    await prisma.$disconnect();
    process.exit(1);
  });
