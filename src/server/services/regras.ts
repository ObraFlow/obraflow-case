// Regras de alçada de uma obra. Único lugar que escreve em RegraAlcada/NivelRegra.
// A validação (limites, aprovadores, sobreposição) é do domínio; aqui só carregamos
// as faixas da obra e persistimos.

import { resolverRegra } from "@/domain/alcada/resolverRegra";
import { validarFaixas, type FaixaParaValidar } from "@/domain/alcada/validarFaixas";
import { NaoEncontrado } from "@/domain/erros";
import { impactoNoOrcamento } from "@/domain/orcamento/resumoOrcamento";
import { cadeiaAcumulada, paraFaixaAlcada } from "@/lib/cadeia";
import type { FaixaAplicavelDto, RegraDto } from "@/lib/dto";
import { formatarFaixa } from "@/lib/money";
import type { SalvarFaixaInput } from "@/lib/schemas/regra";
import { includeRegra, paraRegraDto } from "@/server/dto";
import { prisma } from "@/server/prisma";
import { resumoOrcamentoDaObra } from "@/server/services/orcamento";

export async function listarRegras(obraId: number): Promise<RegraDto[]> {
  const regras = await prisma.regraAlcada.findMany({
    where: { obraId },
    orderBy: { minCents: "asc" },
    include: includeRegra,
  });
  return regras.map(paraRegraDto);
}

/**
 * Preview (simulador na tela de regras e formulário de pedido): qual faixa um valor cairia
 * nesta obra, a cadeia acumulada que aprovaria e o que esse valor faz com o orçamento da
 * obra. Devolve `faixa: null` em vez de lançar erro, porque aqui é só informação para o
 * usuário; quem bloqueia a criação é `criarPedido`. O orçamento vai junto para o formulário
 * mostrar o impacto com a mesma consulta do preview, sem um segundo pedido ao servidor.
 */
export async function obterFaixaAplicavel(
  obraId: number,
  valorCents: number,
): Promise<FaixaAplicavelDto> {
  const [obra, regras, orcamento] = await Promise.all([
    prisma.obra.findUnique({ where: { id: obraId }, select: { nome: true } }),
    listarRegras(obraId),
    resumoOrcamentoDaObra(obraId),
  ]);
  if (!obra) throw new NaoEncontrado("Obra", "f");

  const aplicavel = resolverRegra(regras.map(paraFaixaAlcada), valorCents);
  const faixa = aplicavel ? (regras.find((regra) => regra.id === aplicavel.id) ?? null) : null;

  return {
    obraId,
    obraNome: obra.nome,
    valorCents,
    faixa,
    cadeia: faixa
      ? cadeiaAcumulada(regras, faixa).map(({ ordem, usuarioId, usuarioNome, herdado }) => ({
          ordem,
          usuarioId,
          usuarioNome,
          herdado,
        }))
      : [],
    impacto: orcamento ? impactoNoOrcamento(orcamento, valorCents) : null,
  };
}

/**
 * Cria ou edita uma faixa. Tudo dentro de uma transação: relê as faixas da obra,
 * valida o conjunto com a nova/editada no lugar (decisão de produto 3) e só então grava.
 * Na edição os níveis são apagados e recriados: é uma lista pequena e ordenada, e assim
 * a reordenação não briga com o @@unique([regraId, ordem]).
 * Pedidos já criados não são afetados: eles têm o próprio snapshot da cadeia.
 */
export async function salvarFaixa(input: SalvarFaixaInput): Promise<RegraDto> {
  const niveis = input.aprovadores.map((aprovador, indice) => ({
    ordem: indice,
    usuarioId: aprovador.usuarioId,
  }));

  const regraId = await prisma.$transaction(
    async (tx) => {
      const obra = await tx.obra.findUnique({ where: { id: input.obraId }, select: { id: true } });
      if (!obra) throw new NaoEncontrado("Obra", "f");

      const aprovadores = await tx.usuario.findMany({
        where: { id: { in: niveis.map((nivel) => nivel.usuarioId) } },
        select: { id: true, nome: true },
      });
      if (aprovadores.length !== niveis.length) throw new NaoEncontrado("Aprovador");
      const nomePorId = new Map(aprovadores.map((usuario) => [usuario.id, usuario.nome]));

      if (input.id !== undefined) {
        const existente = await tx.regraAlcada.findUnique({
          where: { id: input.id },
          select: { obraId: true },
        });
        if (!existente || existente.obraId !== input.obraId) throw new NaoEncontrado("Faixa", "f");
      }

      const atuais = await tx.regraAlcada.findMany({
        where: { obraId: input.obraId },
        include: { niveis: { include: { usuario: { select: { nome: true } } } } },
      });

      // Nomes entram só para as mensagens de erro ("João já aprova pela faixa ...").
      const faixaEmEdicao: FaixaParaValidar = {
        id: input.id ?? null,
        minCents: input.minCents,
        maxCents: input.maxCents,
        niveis: niveis.map((nivel) => ({ ...nivel, nome: nomePorId.get(nivel.usuarioId) })),
      };
      const outras: FaixaParaValidar[] = atuais
        .filter((regra) => regra.id !== input.id)
        .map((regra) => ({
          id: regra.id,
          minCents: regra.minCents,
          maxCents: regra.maxCents,
          niveis: regra.niveis.map((nivel) => ({
            ordem: nivel.ordem,
            usuarioId: nivel.usuarioId,
            nome: nivel.usuario.nome,
          })),
          rotulo: formatarFaixa(regra.minCents, regra.maxCents),
        }));

      validarFaixas([...outras, faixaEmEdicao]);

      if (input.id === undefined) {
        const criada = await tx.regraAlcada.create({
          data: {
            obraId: input.obraId,
            minCents: input.minCents,
            maxCents: input.maxCents,
            niveis: { create: niveis },
          },
          select: { id: true },
        });
        return criada.id;
      }

      await tx.nivelRegra.deleteMany({ where: { regraId: input.id } });
      await tx.regraAlcada.update({
        where: { id: input.id },
        data: {
          minCents: input.minCents,
          maxCents: input.maxCents,
          niveis: { create: niveis },
        },
      });
      return input.id;
    },
    // Duas faixas salvas ao mesmo tempo poderiam passar na validação e se sobrepor.
    // Serializable faz o banco abortar a segunda (erro genérico, "tente novamente").
    { isolationLevel: "Serializable" },
  );

  return obterRegra(regraId);
}

export async function obterRegra(id: number): Promise<RegraDto> {
  const regra = await prisma.regraAlcada.findUnique({ where: { id }, include: includeRegra });
  if (!regra) throw new NaoEncontrado("Faixa", "f");
  return paraRegraDto(regra);
}

/** Remove a faixa. Pedidos que a usaram ficam com `regraId` null e seguem com o próprio snapshot. */
export async function removerFaixa(id: number): Promise<void> {
  const removidas = await prisma.regraAlcada.deleteMany({ where: { id } });
  if (removidas.count === 0) throw new NaoEncontrado("Faixa", "f");
}
