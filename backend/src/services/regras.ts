import { prisma } from "../lib/prisma";
import { ErroDeNegocio } from "../erros";

type FaixaEntrada = {
  valorMaximoCentavos: number | null;
  aprovadores: number[]; // ids dos usuários, já na ordem de aprovação
};

export async function listarRegras(idObra: number) {
  const regras = await prisma.regra.findMany({
    where: { idObra },
    include: { aprovadores: { orderBy: { ordem: "asc" }, include: { usuario: true } } },
  });

  // da menor faixa para a maior, com a sem teto no final
  return regras.sort(
    (a, b) => (a.valorMaximoCentavos ?? Infinity) - (b.valorMaximoCentavos ?? Infinity)
  );
}

export async function salvarRegras(idObra: number, faixas: FaixaEntrada[]) {
  if (!Array.isArray(faixas) || faixas.length === 0) {
    throw new ErroDeNegocio("A obra precisa ter pelo menos uma faixa.");
  }

  const tetos = new Set<number>();
  let faixasSemTeto = 0;

  for (const faixa of faixas) {
    const teto = faixa.valorMaximoCentavos;

    if (teto === null) {
      faixasSemTeto++;
    } else {
      if (!Number.isInteger(teto) || teto <= 0) {
        throw new ErroDeNegocio("O valor máximo de cada faixa deve ser maior que zero.");
      }
      if (tetos.has(teto)) {
        throw new ErroDeNegocio("Existem duas faixas com o mesmo valor máximo.");
      }
      tetos.add(teto);
    }

    if (!Array.isArray(faixa.aprovadores) || faixa.aprovadores.length === 0) {
      throw new ErroDeNegocio("Toda faixa precisa de pelo menos um aprovador.");
    }
    if (!faixa.aprovadores.every((id) => Number.isInteger(id))) {
      throw new ErroDeNegocio("Aprovador inválido.");
    }
    if (new Set(faixa.aprovadores).size !== faixa.aprovadores.length) {
      throw new ErroDeNegocio("A mesma pessoa aparece duas vezes na mesma faixa.");
    }
  }

  if (faixasSemTeto > 1) {
    throw new ErroDeNegocio("Só pode existir uma faixa sem teto.");
  }

  const obra = await prisma.obra.findUnique({ where: { idObra } });
  if (!obra) {
    throw new ErroDeNegocio("Obra não encontrada.");
  }

  const idsUsuarios = [...new Set(faixas.flatMap((f) => f.aprovadores))];
  const encontrados = await prisma.usuario.count({ where: { idUsuario: { in: idsUsuarios } } });
  if (encontrados !== idsUsuarios.length) {
    throw new ErroDeNegocio("Algum aprovador não foi encontrado.");
  }

  // troca todas as faixas da obra de uma vez. Pedidos já criados não são afetados,
  // porque cada um guarda a própria cópia da fila em EtapaAprovacao
  await prisma.$transaction(async (tx) => {
    await tx.regraAprovador.deleteMany({ where: { regra: { idObra } } });
    await tx.regra.deleteMany({ where: { idObra } });

    for (const faixa of faixas) {
      await tx.regra.create({
        data: {
          idObra,
          valorMaximoCentavos: faixa.valorMaximoCentavos,
          aprovadores: {
            create: faixa.aprovadores.map((idUsuario, indice) => ({
              idUsuario,
              ordem: indice + 1,
            })),
          },
        },
      });
    }
  });

  return listarRegras(idObra);
}