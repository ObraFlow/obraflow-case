import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AprovacaoStatus,
  HistoricoAcao,
  PedidoStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RegrasAlcadaService } from '../regras-alcada/regras-alcada.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { AprovarPedidoDto } from './dto/aprovar-pedido.dto';
import { RejeitarPedidoDto } from './dto/rejeitar-pedido.dto';

@Injectable()
export class PedidosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly regrasAlcadaService: RegrasAlcadaService,
  ) {}

  async create(dto: CreatePedidoDto) {
    const obra = await this.prisma.obra.findUnique({
      where: { id: dto.obraId },
    });
    if (!obra) {
      throw new NotFoundException(`Obra ${dto.obraId} não encontrada`);
    }

    const fornecedor = await this.prisma.fornecedor.findUnique({
      where: { id: dto.fornecedorId },
    });
    if (!fornecedor) {
      throw new NotFoundException(`Fornecedor ${dto.fornecedorId} não encontrado`);
    }

    // Calcular totais de cada item e o valor total do pedido
    const itensCalculados = dto.itens.map((item) => {
      const totalItem = Number(
        (Number(item.quantidade) * Number(item.precoUnitario)).toFixed(2),
      );
      return {
        descricao: item.descricao.trim(),
        quantidade: new Prisma.Decimal(item.quantidade),
        unidade: item.unidade.trim(),
        precoUnitario: new Prisma.Decimal(item.precoUnitario),
        totalItem: new Prisma.Decimal(totalItem),
      };
    });

    const valorTotalNumero = itensCalculados.reduce(
      (acc, curr) => acc + Number(curr.totalItem),
      0,
    );
    const valorTotalFormatado = Number(valorTotalNumero.toFixed(2));

    // Determinar regra de alçada aplicável pelo motor
    const regraAlcada = await this.regrasAlcadaService.determinarAlcada(
      dto.obraId,
      valorTotalFormatado,
    );

    if (!regraAlcada || regraAlcada.aprovadores.length === 0) {
      throw new BadRequestException(
        `Nenhuma regra de alçada configurada na obra "${obra.nome}" para o valor total de R$ ${valorTotalFormatado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. É necessário cadastrar a regra antes de emitir o pedido.`,
      );
    }

    // Gerar número sequencial amigável do pedido
    const countTotal = await this.prisma.pedido.count();
    const anoAtual = new Date().getFullYear();
    const numeroFormatado = `PED-${anoAtual}-${String(countTotal + 1).padStart(4, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.create({
        data: {
          numero: numeroFormatado,
          obraId: dto.obraId,
          fornecedorId: dto.fornecedorId,
          dataPedido: new Date(dto.dataPedido),
          observacoes: dto.observacoes?.trim() || null,
          valorTotal: new Prisma.Decimal(valorTotalFormatado),
          status: PedidoStatus.PENDENTE,
          regraAlcadaId: regraAlcada.id,
          nivelAtualOrdem: 1, // Começa na primeira etapa
          itens: {
            create: itensCalculados,
          },
          aprovacoes: {
            create: regraAlcada.aprovadores.map((aprovador) => ({
              usuarioId: aprovador.usuarioId,
              ordem: aprovador.ordem,
              status: AprovacaoStatus.PENDENTE,
            })),
          },
          historico: {
            create: {
              acao: HistoricoAcao.CRIADO,
              descricao: `Pedido cadastrado com ${itensCalculados.length} item(ns), totalizando R$ ${valorTotalFormatado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Alçada vinculada com ${regraAlcada.aprovadores.length} etapa(s) de aprovação.`,
            },
          },
        },
        include: {
          obra: true,
          fornecedor: true,
          itens: true,
          aprovacoes: {
            include: { usuario: true },
            orderBy: { ordem: 'asc' },
          },
          historico: {
            orderBy: { criadoEm: 'desc' },
          },
        },
      });

      return pedido;
    });
  }

  async findAll(filtros?: { obraId?: string; status?: PedidoStatus }) {
    const where: Prisma.PedidoWhereInput = {};
    if (filtros?.obraId) {
      where.obraId = filtros.obraId;
    }
    if (filtros?.status) {
      where.status = filtros.status;
    }

    const pedidos = await this.prisma.pedido.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        obra: { select: { id: true, nome: true } },
        fornecedor: { select: { id: true, razaoSocial: true, cnpj: true } },
        itens: { select: { id: true } },
        aprovacoes: {
          include: {
            usuario: {
              select: { id: true, nome: true, email: true, cargo: true },
            },
          },
          orderBy: { ordem: 'asc' },
        },
      },
    });

    return pedidos.map((p) => {
      const aprovadorAtual =
        p.nivelAtualOrdem !== null
          ? p.aprovacoes.find((a) => a.ordem === p.nivelAtualOrdem)?.usuario || null
          : null;

      const aprovadoresConcluidos = p.aprovacoes
        .filter((a) => a.status === AprovacaoStatus.APROVADO)
        .map((a) => a.usuario.nome);

      const proximosAprovadores =
        p.nivelAtualOrdem !== null
          ? p.aprovacoes
              .filter((a) => a.ordem > (p.nivelAtualOrdem ?? 0))
              .map((a) => a.usuario.nome)
          : [];

      return {
        id: p.id,
        numero: p.numero,
        obra: p.obra,
        fornecedor: p.fornecedor,
        dataPedido: p.dataPedido,
        quantidadeItens: p.itens.length,
        valorTotal: Number(p.valorTotal),
        status: p.status,
        nivelAtualOrdem: p.nivelAtualOrdem,
        totalEtapas: p.aprovacoes.length,
        motivoRejeicao: p.motivoRejeicao,
        aprovadorAtual,
        aprovadoresConcluidos,
        proximosAprovadores,
        createdAt: p.createdAt,
      };
    });
  }

  async findById(id: string) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
      include: {
        obra: true,
        fornecedor: true,
        regraAlcada: true,
        itens: {
          orderBy: { createdAt: 'asc' },
        },
        aprovacoes: {
          include: {
            usuario: true,
          },
          orderBy: { ordem: 'asc' },
        },
        historico: {
          include: {
            usuario: true,
          },
          orderBy: { criadoEm: 'desc' },
        },
      },
    });

    if (!pedido) {
      throw new NotFoundException(`Pedido ${id} não encontrado`);
    }

    const aprovadorAtual =
      pedido.nivelAtualOrdem !== null
        ? pedido.aprovacoes.find((a) => a.ordem === pedido.nivelAtualOrdem)?.usuario ||
          null
        : null;

    return {
      ...pedido,
      valorTotal: Number(pedido.valorTotal),
      itens: pedido.itens.map((item) => ({
        ...item,
        quantidade: Number(item.quantidade),
        precoUnitario: Number(item.precoUnitario),
        totalItem: Number(item.totalItem),
      })),
      aprovadorAtual,
    };
  }

  async aprovar(id: string, dto: AprovarPedidoDto) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
      include: {
        aprovacoes: {
          include: { usuario: true },
          orderBy: { ordem: 'asc' },
        },
      },
    });

    if (!pedido) {
      throw new NotFoundException(`Pedido ${id} não encontrado`);
    }

    if (pedido.status !== PedidoStatus.PENDENTE) {
      throw new BadRequestException(
        `Este pedido já está ${pedido.status}. Não é possível realizar novas decisões de aprovação.`,
      );
    }

    if (pedido.nivelAtualOrdem === null) {
      throw new BadRequestException('A cadeia de aprovação deste pedido já foi finalizada');
    }

    const etapaAtual = pedido.aprovacoes.find(
      (a) => a.ordem === pedido.nivelAtualOrdem,
    );

    if (!etapaAtual) {
      throw new BadRequestException(
        `Inconsistência na alçada: etapa ${pedido.nivelAtualOrdem} não encontrada`,
      );
    }

    if (etapaAtual.usuarioId !== dto.usuarioId) {
      throw new BadRequestException(
        `Apenas o aprovador designado (${etapaAtual.usuario.nome} - ${etapaAtual.usuario.cargo}) pode aprovar a etapa atual (${pedido.nivelAtualOrdem} de ${pedido.aprovacoes.length}). Decisões fora da ordem não são permitidas.`,
      );
    }

    const totalEtapas = pedido.aprovacoes.length;
    const isUltimaEtapa = pedido.nivelAtualOrdem >= totalEtapas;
    const proximaOrdem = isUltimaEtapa ? null : pedido.nivelAtualOrdem + 1;
    const novoStatus = isUltimaEtapa ? PedidoStatus.APROVADO : PedidoStatus.PENDENTE;

    return this.prisma.$transaction(async (tx) => {
      // 1. Atualizar a etapa de aprovação atual
      await tx.pedidoAprovacao.update({
        where: { id: etapaAtual.id },
        data: {
          status: AprovacaoStatus.APROVADO,
          decididoEm: new Date(),
          motivo: dto.observacao?.trim() || null,
        },
      });

      // 2. Atualizar o pedido (avançar nível ou marcar como concluído)
      const pedidoAtualizado = await tx.pedido.update({
        where: { id },
        data: {
          status: novoStatus,
          nivelAtualOrdem: proximaOrdem,
        },
        include: {
          obra: true,
          fornecedor: true,
          itens: true,
          aprovacoes: {
            include: { usuario: true },
            orderBy: { ordem: 'asc' },
          },
          historico: {
            orderBy: { criadoEm: 'desc' },
          },
        },
      });

      // 3. Registrar na trilha de auditoria
      const mensagemHistorico = isUltimaEtapa
        ? `Aprovado por ${etapaAtual.usuario.nome} (${etapaAtual.usuario.cargo}) na etapa final ${pedido.nivelAtualOrdem}/${totalEtapas}. CADEIA DE ALÇADA CONCLUÍDA: Pedido 100% aprovado para compra.`
        : `Aprovado por ${etapaAtual.usuario.nome} (${etapaAtual.usuario.cargo}) na etapa ${pedido.nivelAtualOrdem}/${totalEtapas}. Pedido liberado para a próxima etapa de aprovação.`;

      await tx.pedidoHistorico.create({
        data: {
          pedidoId: id,
          usuarioId: dto.usuarioId,
          acao: HistoricoAcao.APROVADO,
          descricao: dto.observacao
            ? `${mensagemHistorico} Observação: "${dto.observacao.trim()}"`
            : mensagemHistorico,
        },
      });

      return pedidoAtualizado;
    });
  }

  async rejeitar(id: string, dto: RejeitarPedidoDto) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
      include: {
        aprovacoes: {
          include: { usuario: true },
          orderBy: { ordem: 'asc' },
        },
      },
    });

    if (!pedido) {
      throw new NotFoundException(`Pedido ${id} não encontrado`);
    }

    if (pedido.status !== PedidoStatus.PENDENTE) {
      throw new BadRequestException(
        `Este pedido já está ${pedido.status}. Decisões de rejeição só podem ser tomadas em pedidos PENDENTES.`,
      );
    }

    const etapaAtual = pedido.aprovacoes.find(
      (a) => a.ordem === pedido.nivelAtualOrdem,
    );

    if (!etapaAtual) {
      throw new BadRequestException(
        `Inconsistência na alçada: etapa atual ${pedido.nivelAtualOrdem} não encontrada`,
      );
    }

    if (etapaAtual.usuarioId !== dto.usuarioId) {
      throw new BadRequestException(
        `Apenas o aprovador designado da etapa atual (${etapaAtual.usuario.nome}) pode tomar a decisão.`,
      );
    }

    const totalEtapas = pedido.aprovacoes.length;

    return this.prisma.$transaction(async (tx) => {
      // 1. Atualizar a etapa como REJEITADO com o motivo
      await tx.pedidoAprovacao.update({
        where: { id: etapaAtual.id },
        data: {
          status: AprovacaoStatus.REJEITADO,
          decididoEm: new Date(),
          motivo: dto.motivo.trim(),
        },
      });

      // 2. Interromper imediatamente o fluxo do pedido
      const pedidoAtualizado = await tx.pedido.update({
        where: { id },
        data: {
          status: PedidoStatus.REJEITADO,
          motivoRejeicao: dto.motivo.trim(),
          nivelAtualOrdem: null, // Interrompe o fluxo
        },
        include: {
          obra: true,
          fornecedor: true,
          itens: true,
          aprovacoes: {
            include: { usuario: true },
            orderBy: { ordem: 'asc' },
          },
          historico: {
            orderBy: { criadoEm: 'desc' },
          },
        },
      });

      // 3. Registrar auditoria com o motivo obrigatório
      await tx.pedidoHistorico.create({
        data: {
          pedidoId: id,
          usuarioId: dto.usuarioId,
          acao: HistoricoAcao.REJEITADO,
          descricao: `REJEITADO por ${etapaAtual.usuario.nome} (${etapaAtual.usuario.cargo}) na etapa ${pedido.nivelAtualOrdem}/${totalEtapas}. Motivo: "${dto.motivo.trim()}". O fluxo de aprovação foi interrompido.`,
        },
      });

      return pedidoAtualizado;
    });
  }
}
