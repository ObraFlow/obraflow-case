import { Router } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';

const router = Router();

const orderItemSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
  unitPrice: z.number().nonnegative(),
});

const orderSchema = z.object({
  workId: z.number(),
  supplierId: z.number(),
  date: z.string(),
  observations: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
});

router.get('/', async (req, res) => {
  const orders = await prisma.purchaseOrder.findMany({
    include: {
      work: true,
      supplier: true,
      items: true,
      history: {
        include: { user: true }
      }
    }
  });
  
  const ordersWithApprovalState = await Promise.all(orders.map(async (order) => {
    const rule = await prisma.approvalRule.findFirst({
      where: {
        workId: order.workId,
        minValue: { lte: order.total },
        OR: [
          { maxValue: null },
          { maxValue: { gte: order.total } }
        ]
      },
      include: {
        levels: {
          orderBy: { order: 'asc' },
          include: {
            approvers: {
              include: { user: true }
            }
          }
        }
      }
    });

    return {
      ...order,
      rule,
      currentApprovers: rule?.levels[order.currentLevel]?.approvers.map(a => a.user) || []
    };
  }));

  res.json(ordersWithApprovalState);
});

router.post('/', async (req, res) => {
  try {
    const data = orderSchema.parse(req.body);
    
    const total = data.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    
    const rule = await prisma.approvalRule.findFirst({
      where: {
        workId: data.workId,
        minValue: { lte: total },
        OR: [
          { maxValue: null },
          { maxValue: { gte: total } }
        ]
      }
    });

    if (!rule) {
      return res.status(400).json({ error: 'Nenhuma regra de alçada encontrada para este valor nesta obra.' });
    }

    const order = await prisma.purchaseOrder.create({
      data: {
        workId: data.workId,
        supplierId: data.supplierId,
        date: new Date(data.date),
        observations: data.observations,
        total,
        status: 'PENDING',
        currentLevel: 0,
        items: {
          create: data.items.map(item => ({
            ...item,
            total: item.quantity * item.unitPrice
          }))
        }
      }
    });

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
  }
});

router.post('/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  const order = await prisma.purchaseOrder.findUnique({
    where: { id: Number(id) }
  });

  if (!order || order.status !== 'PENDING') {
    return res.status(400).json({ error: 'Pedido não encontrado ou não está pendente.' });
  }

  const rule = await prisma.approvalRule.findFirst({
    where: {
      workId: order.workId,
      minValue: { lte: order.total },
      OR: [
        { maxValue: null },
        { maxValue: { gte: order.total } }
      ]
    },
    include: {
      levels: {
        orderBy: { order: 'asc' },
        include: { approvers: true }
      }
    }
  });

  if (!rule) return res.status(400).json({ error: 'Regra não encontrada.' });

  const currentLevel = rule.levels[order.currentLevel];
  const isAuthorized = currentLevel.approvers.some(a => a.userId === userId);

  if (!isAuthorized) {
    return res.status(403).json({ error: 'Usuário não autorizado para este nível de aprovação.' });
  }

  await prisma.approvalHistory.create({
    data: {
      orderId: order.id,
      userId,
      action: 'APPROVE'
    }
  });

  if (order.currentLevel === rule.levels.length - 1) {
    await prisma.purchaseOrder.update({
      where: { id: order.id },
      data: { status: 'APPROVED' }
    });
  } else {
    await prisma.purchaseOrder.update({
      where: { id: order.id },
      data: { currentLevel: order.currentLevel + 1 }
    });
  }

  res.json({ message: 'Aprovado com sucesso.' });
});

router.post('/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { userId, reason } = req.body;

  if (!reason) return res.status(400).json({ error: 'Motivo de rejeição é obrigatório.' });

  const order = await prisma.purchaseOrder.findUnique({
    where: { id: Number(id) }
  });

  if (!order || order.status !== 'PENDING') {
    return res.status(400).json({ error: 'Pedido não encontrado ou não está pendente.' });
  }

  await prisma.approvalHistory.create({
    data: {
      orderId: order.id,
      userId,
      action: 'REJECT',
      reason
    }
  });

  await prisma.purchaseOrder.update({
    where: { id: order.id },
    data: { status: 'REJECTED' }
  });

  res.json({ message: 'Rejeitado com sucesso.' });
});

export default router;
