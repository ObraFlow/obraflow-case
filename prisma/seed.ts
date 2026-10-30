// Dados de demonstração. Rodar com `npm run db:seed` (prisma db seed → tsx prisma/seed.ts; o CLI carrega o .env).
// Apaga tudo e recria, com ids reiniciados, para a demo sempre começar igual.
//
// O que fica no banco ao final:
//   2 obras, 5 usuários, 2 fornecedores
//   Obra 1: duas faixas (até R$ 10 mil → João; acima → Amanda, que acumula com João antes)
//   Obra 2: faixa única sem teto (Carla → Beatriz)
//   5 pedidos: pendente no step 0, pendente no step 1, aprovado (1 nível),
//              aprovado (2 níveis) e rejeitado com motivo.

import { prisma } from "../src/server/prisma";

// Total de um item em centavos. Mesmo cálculo que o domínio fará em runtime (Fase 2).
function totalItemCents(quantidade: string, precoUnitarioCents: number): number {
  return Math.round(Number(quantidade) * precoUnitarioCents);
}

type ItemSeed = {
  descricao: string;
  quantidade: string;
  unidade: string;
  precoUnitarioCents: number;
};

function montarItens(itens: ItemSeed[]) {
  const comTotal = itens.map((item, indice) => ({
    ordem: indice,
    descricao: item.descricao,
    quantidade: item.quantidade,
    unidade: item.unidade,
    precoUnitarioCents: item.precoUnitarioCents,
    totalCents: totalItemCents(item.quantidade, item.precoUnitarioCents),
  }));
  const totalCents = comTotal.reduce((soma, item) => soma + item.totalCents, 0);
  return { itens: comTotal, totalCents };
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
    data: { nome: "Residencial Jardim das Acácias" },
  });
  const galpao = await prisma.obra.create({ data: { nome: "Galpão Logístico BR-324" } });

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

  // --- Regras de alçada -----------------------------------------------------

  // Obra 1: até R$ 10.000,00 só o engenheiro residente; acima, a diretora entra depois dele.
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

  // Obra 2: qualquer valor passa por suprimentos e depois pelo financeiro.
  const faixaUnicaGalpao = await prisma.regraAlcada.create({
    data: {
      obraId: galpao.id,
      minCents: 0,
      maxCents: null,
      niveis: {
        create: [
          { ordem: 0, usuarioId: carla.id },
          { ordem: 1, usuarioId: beatriz.id },
        ],
      },
    },
  });

  // --- Pedidos --------------------------------------------------------------
  // A cadeia (aprovacoes) é a cópia dos níveis da faixa no momento da criação.

  // #1 — Obra 1, R$ 7.800,00: faixa baixa, só João. Pendente no step 0.
  {
    const { itens, totalCents } = montarItens([
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
    ]);
    await prisma.pedido.create({
      data: {
        obraId: residencial.id,
        fornecedorId: cimentos.id,
        criadoPorId: rafael.id,
        dataPedido: new Date("2026-10-26"),
        // `criadoEm` fixo e coerente com as decisões: o acompanhamento mede tempos a partir dele.
        criadoEm: new Date("2026-10-26T09:00:00Z"),
        observacoes: "Reposição de estoque para a concretagem da laje do bloco B.",
        totalCents,
        regraId: faixaBaixaResidencial.id,
        stepAtual: 0,
        itens: { create: itens },
        aprovacoes: { create: [{ ordem: 0, aprovadorId: joao.id }] },
      },
    });
  }

  // #2 — Obra 1, R$ 25.200,00: faixa alta, João → Amanda. João aprovou; pendente no step 1.
  {
    const { itens, totalCents } = montarItens([
      {
        descricao: "Concreto usinado fck 25 MPa",
        quantidade: "60",
        unidade: "m³",
        precoUnitarioCents: 42_000,
      },
    ]);
    await prisma.pedido.create({
      data: {
        obraId: residencial.id,
        fornecedorId: cimentos.id,
        criadoPorId: rafael.id,
        dataPedido: new Date("2026-10-23"),
        criadoEm: new Date("2026-10-23T10:00:00Z"),
        observacoes: "Concretagem da laje do 3º pavimento, bloco A. Bombeamento incluso.",
        totalCents,
        regraId: faixaAltaResidencial.id,
        stepAtual: 1,
        itens: { create: itens },
        aprovacoes: {
          create: [
            {
              ordem: 0,
              aprovadorId: joao.id,
              status: "APROVADA",
              decididoEm: new Date("2026-10-23T14:10:00Z"),
            },
            { ordem: 1, aprovadorId: amanda.id },
          ],
        },
      },
    });
  }

  // #3 — Obra 1, R$ 2.352,00: faixa baixa, João aprovou. Cadeia de 1 nível concluída.
  {
    const { itens, totalCents } = montarItens([
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
    ]);
    await prisma.pedido.create({
      data: {
        obraId: residencial.id,
        fornecedorId: ferragens.id,
        criadoPorId: rafael.id,
        dataPedido: new Date("2026-10-15"),
        criadoEm: new Date("2026-10-15T08:00:00Z"),
        totalCents,
        regraId: faixaBaixaResidencial.id,
        stepAtual: 1,
        status: "APROVADO",
        itens: { create: itens },
        aprovacoes: {
          create: [
            {
              ordem: 0,
              aprovadorId: joao.id,
              status: "APROVADA",
              decididoEm: new Date("2026-10-15T17:32:00Z"),
            },
          ],
        },
      },
    });
  }

  // #4 — Obra 2, R$ 28.920,00: Carla → Beatriz, ambas aprovaram. Cadeia de 2 níveis concluída.
  {
    const { itens, totalCents } = montarItens([
      { descricao: "Aço CA-50 10 mm", quantidade: "2400", unidade: "kg", precoUnitarioCents: 890 },
      {
        descricao: "Telha metálica trapezoidal 0,5 mm",
        quantidade: "40",
        unidade: "un",
        precoUnitarioCents: 18_900,
      },
    ]);
    await prisma.pedido.create({
      data: {
        obraId: galpao.id,
        fornecedorId: ferragens.id,
        criadoPorId: rafael.id,
        dataPedido: new Date("2026-10-10"),
        criadoEm: new Date("2026-10-09T15:00:00Z"),
        observacoes: "Estrutura da cobertura, módulo 1.",
        totalCents,
        regraId: faixaUnicaGalpao.id,
        stepAtual: 2,
        status: "APROVADO",
        itens: { create: itens },
        aprovacoes: {
          create: [
            {
              ordem: 0,
              aprovadorId: carla.id,
              status: "APROVADA",
              decididoEm: new Date("2026-10-10T11:05:00Z"),
            },
            {
              ordem: 1,
              aprovadorId: beatriz.id,
              status: "APROVADA",
              decididoEm: new Date("2026-10-13T09:40:00Z"),
            },
          ],
        },
      },
    });
  }

  // #5 — Obra 1, R$ 16.800,00: faixa alta, João → Amanda. João rejeitou com motivo; Amanda nunca decidiu.
  {
    const { itens, totalCents } = montarItens([
      {
        descricao: "Porcelanato 60x60 acetinado",
        quantidade: "240",
        unidade: "m²",
        precoUnitarioCents: 7_000,
      },
    ]);
    await prisma.pedido.create({
      data: {
        obraId: residencial.id,
        fornecedorId: ferragens.id,
        criadoPorId: rafael.id,
        dataPedido: new Date("2026-10-20"),
        criadoEm: new Date("2026-10-20T13:00:00Z"),
        observacoes: "Revestimento das áreas comuns.",
        totalCents,
        regraId: faixaAltaResidencial.id,
        stepAtual: 0,
        status: "REJEITADO",
        itens: { create: itens },
        aprovacoes: {
          create: [
            {
              ordem: 0,
              aprovadorId: joao.id,
              status: "REJEITADA",
              motivo:
                "Quantidade acima do previsto no orçamento desta etapa. Revisar o quantitativo com o almoxarifado.",
              decididoEm: new Date("2026-10-21T08:15:00Z"),
            },
            { ordem: 1, aprovadorId: amanda.id, status: "CANCELADA" },
          ],
        },
      },
    });
  }

  const resumo = await prisma.pedido.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      status: true,
      stepAtual: true,
      totalCents: true,
      obra: { select: { nome: true } },
    },
  });
  console.table(resumo.map((p) => ({ ...p, obra: p.obra.nome })));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (erro) => {
    console.error(erro);
    await prisma.$disconnect();
    process.exit(1);
  });
