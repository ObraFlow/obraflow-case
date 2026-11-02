import { prisma } from "../lib/prisma";
import { ErroDeNegocio } from "../erros";
import { escolherFaixa, proximoEstado } from "./alcada";

const UNIDADES = ["un", "kg", "m", "m²", "h"];

type ItemEntrada = {
  descricao: string;
  quantidade: number;
  unidade: string;
  precoUnitarioCentavos: number;
};

type PedidoEntrada = {
  idObra: number;
  idFornecedor: number;
  dataPedido: string;
  observacoes?: string;
  itens: ItemEntrada[];
};

export async function criarPedido(dados: PedidoEntrada) {
  // 1. valida os dados gerais e os itens
  if (!Number.isInteger(dados.idObra)) {
    throw new ErroDeNegocio("Selecione a obra.");
  }
  if (!Number.isInteger(dados.idFornecedor)) {
    throw new ErroDeNegocio("Selecione o fornecedor.");
  }

  // a data chega como "2026-10-26". Guardo ao meio-dia para o fuso não jogar para o dia anterior
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.dataPedido ?? "")) {
    throw new ErroDeNegocio("Informe uma data do pedido válida.");
  }
  const dataPedido = new Date(`${dados.dataPedido}T12:00:00`);
  if (Number.isNaN(dataPedido.getTime())) {
    throw new ErroDeNegocio("Informe uma data do pedido válida.");
  }

  if (!dados.itens || dados.itens.length === 0) {
    throw new ErroDeNegocio("O pedido precisa ter pelo menos um item.");
  }

  for (const item of dados.itens) {
    if (!item.descricao?.trim()) {
      throw new ErroDeNegocio("Todo item precisa de uma descrição.");
    }
    if (!Number.isFinite(item.quantidade) || item.quantidade <= 0) {
      throw new ErroDeNegocio("A quantidade de cada item deve ser maior que zero.");
    }
    if (!Number.isInteger(item.precoUnitarioCentavos) || item.precoUnitarioCentavos < 0) {
      throw new ErroDeNegocio("O preço de cada item não pode ser negativo.");
    }
    if (!UNIDADES.includes(item.unidade)) {
      throw new ErroDeNegocio(`Unidade inválida: ${item.unidade}`);
    }
  }

  // 2. calcula o total de cada item e do pedido. Quem calcula é o back, não o front
  const itens = dados.itens.map((item) => ({
    descricao: item.descricao.trim(),
    quantidade: item.quantidade,
    unidade: item.unidade,
    precoUnitarioCentavos: item.precoUnitarioCentavos,
    totalCentavos: Math.round(item.quantidade * item.precoUnitarioCentavos),
  }));

  const totalCentavos = itens.reduce((soma, item) => soma + item.totalCentavos, 0);

  // 3. confere se a obra e o fornecedor existem, e escolhe a faixa
  const obra = await prisma.obra.findUnique({
    where: { idObra: dados.idObra },
    include: { regras: true },
  });
  if (!obra) {
    throw new ErroDeNegocio("Obra não encontrada.");
  }

  const fornecedor = await prisma.fornecedor.findUnique({
    where: { idFornecedor: dados.idFornecedor },
  });
  if (!fornecedor) {
    throw new ErroDeNegocio("Fornecedor não encontrado.");
  }

  const faixa = escolherFaixa(obra.regras, totalCentavos);
  if (!faixa) {
    throw new ErroDeNegocio(
      "Nenhuma regra de alçada desta obra cobre esse valor. Ajuste as regras antes de criar o pedido."
    );
  }

  const aprovadores = await prisma.regraAprovador.findMany({
    where: { idRegra: faixa.idRegra },
    orderBy: { ordem: "asc" },
  });
  if (aprovadores.length === 0) {
    throw new ErroDeNegocio("A faixa escolhida não tem aprovadores cadastrados.");
  }

  // 4. cria o pedido com os itens e a fila de aprovação copiada da regra, tudo de uma vez
  return prisma.pedido.create({
    data: {
      idObra: obra.idObra,
      idFornecedor: fornecedor.idFornecedor,
      dataPedido,
      observacoes: dados.observacoes?.trim() || null,
      totalCentavos,
      status: "PENDENTE",
      etapaAtual: 1,
      itens: { create: itens },
      etapas: {
        create: aprovadores.map((aprovador, indice) => ({
          idUsuario: aprovador.idUsuario,
          ordem: indice + 1,
        })),
      },
    },
    include: { itens: true, etapas: true },
  });
}

export async function decidirPedido(
  idPedido: number,
  idUsuario: number,
  decisao: "APROVADO" | "REJEITADO",
  motivo?: string
) {
  const motivoLimpo = motivo?.trim();
  if (decisao === "REJEITADO" && !motivoLimpo) {
    throw new ErroDeNegocio("Informe o motivo da rejeição.");
  }

  // tudo dentro de uma transação: ou salva todas as mudanças, ou nenhuma
  return prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.findUnique({
      where: { idPedido },
      include: { etapas: true },
    });
    if (!pedido) {
      throw new ErroDeNegocio("Pedido não encontrado.");
    }
    if (pedido.status !== "PENDENTE" || pedido.etapaAtual === null) {
      throw new ErroDeNegocio("Este pedido já foi concluído e não aceita novas decisões.");
    }

    const etapa = pedido.etapas.find((e) => e.ordem === pedido.etapaAtual);
    if (!etapa) {
      throw new Error(`Pedido ${idPedido} sem a etapa ${pedido.etapaAtual}`);
    }
    if (etapa.idUsuario !== idUsuario) {
      throw new ErroDeNegocio("Não é a sua vez de decidir sobre este pedido.");
    }

    // só grava se a etapa ainda estiver aguardando. Evita duas decisões ao mesmo tempo
    const atualizada = await tx.etapaAprovacao.updateMany({
      where: { idEtapaAprovacao: etapa.idEtapaAprovacao, status: "AGUARDANDO" },
      data: {
        status: decisao,
        motivo: decisao === "REJEITADO" ? motivoLimpo : null,
        decididoEm: new Date(),
      },
    });
    if (atualizada.count === 0) {
      throw new ErroDeNegocio("Este pedido acabou de ser decidido. Atualize a tela.");
    }

       const { status, etapaAtual } = proximoEstado(etapa.ordem, pedido.etapas.length, decisao);

    return tx.pedido.update({
      where: { idPedido },
      data: { status, etapaAtual },
      include: { itens: true, etapas: { orderBy: { ordem: "asc" } } },
    });
  });
}