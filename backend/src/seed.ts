import { prisma } from "./lib/prisma";

// converte reais para centavos, que é como o dinheiro fica salvo no banco
const reais = (valor: number) => Math.round(valor * 100);

// monta um item já com o total calculado (quantidade x preço)
const item = (descricao: string, quantidade: number, unidade: string, preco: number) => ({
  descricao,
  quantidade,
  unidade,
  precoUnitarioCentavos: reais(preco),
  totalCentavos: Math.round(quantidade * reais(preco)),
});

async function main() {
  // limpa tudo antes, assim dá pra rodar o seed de novo sem duplicar dados
  await prisma.etapaAprovacao.deleteMany();
  await prisma.itemPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.regraAprovador.deleteMany();
  await prisma.regra.deleteMany();
  await prisma.fornecedor.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.obra.deleteMany();

  const sol = await prisma.obra.create({ data: { nome: "Edifício Sol Nascente" } });
  const mar = await prisma.obra.create({ data: { nome: "Edifício Mar Azul" } });

  const amanda = await prisma.usuario.create({ data: { nome: "Amanda Souza", email: "amanda.souza@example.com" } });
  const joao = await prisma.usuario.create({ data: { nome: "João Lima", email: "joao.lima@example.com" } });
  const carla = await prisma.usuario.create({ data: { nome: "Carla Mendes", email: "carla.mendes@example.com" } });

  const cimentos = await prisma.fornecedor.create({ data: { nome: "Cimentos Bahia", cnpj: "12.345.678/0001-90" } });
  const ferragens = await prisma.fornecedor.create({ data: { nome: "Ferragens Salvador", cnpj: "98.765.432/0001-10" } });

  // faixas do Sol Nascente
  await prisma.regra.create({
    data: {
      idObra: sol.idObra,
      valorMaximoCentavos: reais(5000),
      aprovadores: { create: [{ idUsuario: amanda.idUsuario, ordem: 1 }] },
    },
  });

  await prisma.regra.create({
    data: {
      idObra: sol.idObra,
      valorMaximoCentavos: reais(20000),
      aprovadores: {
        create: [
          { idUsuario: amanda.idUsuario, ordem: 1 },
          { idUsuario: joao.idUsuario, ordem: 2 },
        ],
      },
    },
  });

  await prisma.regra.create({
    data: {
      idObra: sol.idObra,
      valorMaximoCentavos: null, // sem teto
      aprovadores: {
        create: [
          { idUsuario: amanda.idUsuario, ordem: 1 },
          { idUsuario: joao.idUsuario, ordem: 2 },
          { idUsuario: carla.idUsuario, ordem: 3 },
        ],
      },
    },
  });

  // faixas do Mar Azul
  await prisma.regra.create({
    data: {
      idObra: mar.idObra,
      valorMaximoCentavos: reais(10000),
      aprovadores: { create: [{ idUsuario: joao.idUsuario, ordem: 1 }] },
    },
  });

  await prisma.regra.create({
    data: {
      idObra: mar.idObra,
      valorMaximoCentavos: null, // sem teto
      aprovadores: {
        create: [
          { idUsuario: joao.idUsuario, ordem: 1 },
          { idUsuario: carla.idUsuario, ordem: 2 },
        ],
      },
    },
  });

    // pedido 1: esperando a Amanda (primeira da fila)
  await prisma.pedido.create({
    data: {
      idObra: sol.idObra,
      idFornecedor: cimentos.idFornecedor,
      totalCentavos: reais(3200),
      status: "PENDENTE",
      etapaAtual: 1,
      itens: { create: [item("Cimento CP-II 50kg", 80, "un", 40)] },
      etapas: { create: [{ idUsuario: amanda.idUsuario, ordem: 1 }] },
    },
  });

  // pedido 2: Amanda já aprovou, agora é a vez do João
  await prisma.pedido.create({
    data: {
      idObra: sol.idObra,
      idFornecedor: ferragens.idFornecedor,
      totalCentavos: reais(12500),
      status: "PENDENTE",
      etapaAtual: 2,
      itens: {
        create: [
          item("Vergalhão CA-50 10mm", 200, "un", 50),
          item("Arame recozido", 100, "kg", 25),
        ],
      },
      etapas: {
        create: [
          { idUsuario: amanda.idUsuario, ordem: 1, status: "APROVADO", decididoEm: new Date() },
          { idUsuario: joao.idUsuario, ordem: 2 },
        ],
      },
    },
  });

  // pedido 3: aprovado, a cadeia terminou
  await prisma.pedido.create({
    data: {
      idObra: sol.idObra,
      idFornecedor: cimentos.idFornecedor,
      totalCentavos: reais(4000),
      status: "APROVADO",
      etapaAtual: null,
      itens: { create: [item("Areia média", 40, "m³", 100)] },
      etapas: {
        create: [{ idUsuario: amanda.idUsuario, ordem: 1, status: "APROVADO", decididoEm: new Date() }],
      },
    },
  });

  // pedido 4: rejeitado pelo João, com motivo
  await prisma.pedido.create({
    data: {
      idObra: mar.idObra,
      idFornecedor: cimentos.idFornecedor,
      totalCentavos: reais(8000),
      status: "REJEITADO",
      etapaAtual: null,
      observacoes: "Entregar no térreo",
      itens: { create: [item("Porcelanato 60x60", 200, "m²", 40)] },
      etapas: {
        create: [
          {
            idUsuario: joao.idUsuario,
            ordem: 1,
            status: "REJEITADO",
            motivo: "Preço acima do orçado para o acabamento",
            decididoEm: new Date(),
          },
        ],
      },
    },
  });

  console.log("Seed concluído!");
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());