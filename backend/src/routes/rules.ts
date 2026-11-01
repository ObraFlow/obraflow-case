import { Router } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';

const router = Router();

const ruleSchema = z.object({
  workId: z.number(),
  minValue: z.number(),
  maxValue: z.number().nullable(),
  levels: z.array(z.object({
    order: z.number(),
    approverIds: z.array(z.number())
  }))
});

router.get('/:workId', async (req, res) => {
  const { workId } = req.params;
  const rules = await prisma.approvalRule.findMany({
    where: { workId: Number(workId) },
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
  res.json(rules);
});

router.post('/', async (req, res) => {
  try {
    const data = ruleSchema.parse(req.body);
    
    const rule = await prisma.approvalRule.create({
      data: {
        workId: data.workId,
        minValue: data.minValue,
        maxValue: data.maxValue,
        levels: {
          create: data.levels.map(level => ({
            order: level.order,
            approvers: {
              create: level.approverIds.map(userId => ({
                userId
              }))
            }
          }))
        }
      },
      include: {
        levels: {
          include: {
            approvers: true
          }
        }
      }
    });
    
    res.json(rule);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  await prisma.approvalRule.delete({
    where: { id: Number(id) }
  });
  res.sendStatus(204);
});

export default router;
