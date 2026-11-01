import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.get('/', async (req, res) => {
  const works = await prisma.work.findMany();
  res.json(works);
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  const work = await prisma.work.create({
    data: { name },
  });
  res.json(work);
});

export default router;
