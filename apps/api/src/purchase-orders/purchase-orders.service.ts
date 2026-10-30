import { HttpStatus, Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '../../prisma/generated/client.js';
import { HistoryType, StepStatus } from '../../prisma/generated/enums.js';
import { noRuleMessage } from '../approval-rules/approval-rules.service.js';
import {
  AppException,
  type ErrorDetail,
} from '../common/errors/app.exception.js';
import {
  approveCurrentStep,
  type FlowState,
  rejectCurrentStep,
  startFlow,
} from '../common/domain/approval-flow.js';
import { resolveRule } from '../common/domain/approval-rules.js';
import {
  Decimal,
  itemTotal,
  MAX_MONEY,
  orderTotal,
} from '../common/domain/money.js';
import { PrismaService } from '../common/prisma/prisma.service.js';
import type {
  CreatePurchaseOrderDto,
  ListPurchaseOrdersQuery,
} from './purchase-order.dto.js';
import {
  ORDER_DETAIL_INCLUDE,
  ORDER_SUMMARY_INCLUDE,
  toOrderDetail,
  toOrderSummary,
} from './purchase-order.mapper.js';

type Decision = { action: 'approve' } | { action: 'reject'; reason: string };

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // Criação
  // -------------------------------------------------------------------------

  async create(dto: CreatePurchaseOrderDto) {
    await this.assertReferencesExist(dto);

    // Totais sempre calculados aqui (o cliente nunca envia totais).
    const items = dto.items.map((item, index) => {
      const quantity = new Decimal(item.quantity);
      const unitPrice = new Decimal(item.unitPrice);
      return {
        position: index + 1,
        description: item.description,
        unit: item.unit,
        quantity,
        unitPrice,
        total: itemTotal(quantity, unitPrice),
      };
    });
    const totalAmount = orderTotal(items.map((item) => item.total));
    assertTotalsFit(items, totalAmount);

    // Numa transação: ou grava cabeçalho, itens, etapas e histórico, ou não grava nada.
    // RepeatableRead: faixas e aprovadores são lidos da mesma "foto" do banco, mesmo que alguém
    // edite a faixa ao mesmo tempo (a cadeia copiada nunca mistura duas versões da faixa).
    const orderId = await this.prisma.$transaction(
      async (tx) => {
        const rules = await tx.approvalRule.findMany({
          where: { projectId: dto.projectId },
          include: { approvers: { orderBy: { position: 'asc' } } },
        });
        const rule = resolveRule(rules, totalAmount);
        if (!rule) {
          const project = await tx.project.findUniqueOrThrow({
            where: { id: dto.projectId },
          });
          throw AppException.unprocessable(
            'NO_APPROVAL_RULE',
            noRuleMessage(totalAmount, project.name),
          );
        }

        // A cadeia da faixa é copiada para o pedido: editar a faixa depois não muda este pedido.
        const flow = startFlow(rule.approvers.length);
        const order = await tx.purchaseOrder.create({
          data: {
            projectId: dto.projectId,
            supplierId: dto.supplierId,
            requesterId: dto.requesterId,
            orderDate: new Date(`${dto.orderDate}T00:00:00.000Z`),
            notes: dto.notes,
            totalAmount,
            status: flow.status,
            currentStep: flow.currentStep,
            ruleId: rule.id,
            ruleFromAmount: rule.fromAmount,
            ruleMaxAmount: rule.maxAmount,
            items: { create: items },
            steps: {
              create: rule.approvers.map((approver, index) => ({
                position: approver.position,
                approverId: approver.userId,
                status: flow.steps[index],
              })),
            },
            events: {
              create: { type: HistoryType.CREATED, actorId: dto.requesterId },
            },
          },
        });
        return order.id;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );

    return this.get(orderId);
  }

  // -------------------------------------------------------------------------
  // Consulta
  // -------------------------------------------------------------------------

  async list(query: ListPurchaseOrdersQuery) {
    // Filtros comuns às abas (obra e busca). A situação e o "aguardando" são aplicados por cima.
    const base: Prisma.PurchaseOrderWhereInput = {
      projectId: query.projectId,
      ...(query.q ? { OR: searchConditions(query.q) } : {}),
    };
    const awaiting: Prisma.PurchaseOrderWhereInput | undefined =
      query.awaitingUserId
        ? {
            steps: {
              some: {
                approverId: query.awaitingUserId,
                status: StepStatus.PENDING,
              },
            },
          }
        : undefined;
    const where: Prisma.PurchaseOrderWhereInput = {
      AND: [base, awaiting ?? {}, query.status ? { status: query.status } : {}],
    };

    const [orders, total, byStatus, awaitingCount] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: ORDER_SUMMARY_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.purchaseOrder.count({ where }),
      this.prisma.purchaseOrder.groupBy({
        by: ['status'],
        where: base,
        _count: true,
      }),
      awaiting
        ? this.prisma.purchaseOrder.count({ where: { AND: [base, awaiting] } })
        : null,
    ]);

    const countOf = (status: OrderStatus) =>
      byStatus.find((row) => row.status === status)?._count ?? 0;
    return {
      data: orders.map(toOrderSummary),
      meta: { page: query.page, pageSize: query.pageSize, total },
      // Contadores das abas: consideram obra e busca, mas não a aba selecionada.
      counts: {
        awaiting: awaitingCount,
        pending: countOf(OrderStatus.PENDING),
        approved: countOf(OrderStatus.APPROVED),
        rejected: countOf(OrderStatus.REJECTED),
        all: byStatus.reduce((sum, row) => sum + row._count, 0),
      },
    };
  }

  async get(id: number) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: ORDER_DETAIL_INCLUDE,
    });
    if (!order) throw AppException.notFound('Pedido não encontrado.');
    return toOrderDetail(order);
  }

  // -------------------------------------------------------------------------
  // Decisões
  // -------------------------------------------------------------------------

  approve(id: number, stepId: number) {
    return this.decide(id, stepId, { action: 'approve' });
  }

  reject(id: number, stepId: number, reason: string) {
    return this.decide(id, stepId, { action: 'reject', reason });
  }

  /**
   * Aplica uma decisão na etapa atual.
   *
   * Concorrência: o cliente envia o `stepId` que estava vendo. A atualização do pedido é condicional
   * (WHERE status = PENDING AND currentStep = <etapa lida>). Se duas decisões chegarem juntas, o
   * Postgres serializa as duas atualizações na mesma linha: a primeira vence, a segunda não encontra
   * mais a condição (count = 0), recebe 409 e a transação dela é desfeita por inteiro.
   */
  private async decide(id: number, stepId: number, decision: Decision) {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { steps: { orderBy: { position: 'asc' } } },
      });
      if (!order) throw AppException.notFound('Pedido não encontrado.');
      if (order.status !== OrderStatus.PENDING || order.currentStep === null) {
        throw AppException.conflict(
          'ORDER_ALREADY_DECIDED',
          alreadyDecidedMessage(order.status),
        );
      }

      const currentStep = order.steps[order.currentStep - 1];
      if (currentStep.id !== stepId) throw stepNotCurrent();

      const state: FlowState = {
        status: order.status,
        currentStep: order.currentStep,
        steps: order.steps.map((step) => step.status),
      };
      const next =
        decision.action === 'approve'
          ? approveCurrentStep(state)
          : rejectCurrentStep(state);

      const { count } = await tx.purchaseOrder.updateMany({
        where: {
          id,
          status: OrderStatus.PENDING,
          currentStep: order.currentStep,
        },
        data: { status: next.status, currentStep: next.currentStep },
      });
      if (count === 0) throw stepNotCurrent();

      const now = new Date();
      for (const [index, step] of order.steps.entries()) {
        if (next.steps[index] === step.status) continue;
        await tx.approvalStep.update({
          where: { id: step.id },
          data: {
            status: next.steps[index],
            decidedAt: step.id === currentStep.id ? now : undefined,
          },
        });
      }

      // Histórico append-only: a decisão é atribuída ao aprovador da etapa atual.
      await tx.purchaseOrderEvent.create({
        data: {
          orderId: id,
          type:
            decision.action === 'approve'
              ? HistoryType.APPROVED
              : HistoryType.REJECTED,
          actorId: currentStep.approverId,
          stepPosition: currentStep.position,
          reason: decision.action === 'reject' ? decision.reason : null,
          createdAt: now,
        },
      });
    });

    return this.get(id);
  }

  // -------------------------------------------------------------------------

  private async assertReferencesExist(dto: CreatePurchaseOrderDto) {
    const [project, supplier, requester] = await Promise.all([
      this.prisma.project.findUnique({
        where: { id: dto.projectId },
        select: { id: true },
      }),
      this.prisma.supplier.findUnique({
        where: { id: dto.supplierId },
        select: { id: true },
      }),
      this.prisma.user.findUnique({
        where: { id: dto.requesterId },
        select: { id: true },
      }),
    ]);
    const details: ErrorDetail[] = [];
    if (!project)
      details.push({ field: 'projectId', message: 'Obra não encontrada.' });
    if (!supplier)
      details.push({
        field: 'supplierId',
        message: 'Fornecedor não encontrado.',
      });
    if (!requester)
      details.push({
        field: 'requesterId',
        message: 'Solicitante não encontrado.',
      });
    if (details.length > 0) {
      throw AppException.unprocessable(
        'INVALID_REFERENCE',
        'Dados de referência inválidos.',
        details,
      );
    }
  }
}

/**
 * Cada número do item é validado no DTO, mas o produto (e a soma) pode passar do que cabe
 * na coluna numeric(14,2). Sem esta checagem, o banco recusaria o valor e a API responderia 500.
 */
function assertTotalsFit(items: { total: Decimal }[], totalAmount: Decimal) {
  const details: ErrorDetail[] = items.flatMap((item, index) =>
    item.total.gt(MAX_MONEY)
      ? [
          {
            field: `items.${index}`,
            message: 'O total do item excede o valor máximo permitido.',
          },
        ]
      : [],
  );
  if (details.length === 0 && totalAmount.gt(MAX_MONEY)) {
    details.push({
      field: 'items',
      message: 'O total do pedido excede o valor máximo permitido.',
    });
  }
  if (details.length > 0) {
    throw new AppException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'Dados inválidos.',
      details,
    );
  }
}

/** "PED-009", "ped9" ou "9" buscam pelo código; qualquer texto busca pelo nome do fornecedor. */
function searchConditions(q: string): Prisma.PurchaseOrderWhereInput[] {
  const conditions: Prisma.PurchaseOrderWhereInput[] = [
    { supplier: { name: { contains: q, mode: 'insensitive' } } },
  ];
  const code = /^(?:ped-?)?0*(\d{1,9})$/i.exec(q);
  if (code) conditions.push({ id: Number(code[1]) });
  return conditions;
}

function stepNotCurrent() {
  return AppException.conflict(
    'STEP_NOT_CURRENT',
    'Este pedido já foi decidido por outra pessoa. Atualize a tela para ver a situação atual.',
  );
}

function alreadyDecidedMessage(status: OrderStatus) {
  return status === OrderStatus.APPROVED
    ? 'Este pedido já foi aprovado. Não há decisão pendente.'
    : 'Este pedido foi rejeitado e o fluxo foi encerrado.';
}
