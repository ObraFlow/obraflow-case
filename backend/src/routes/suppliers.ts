import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.get('/', async (req, res) => {
  const suppliers = await prisma.supplier.findMany();
  res.json(suppliers);
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  const supplier = await prisma.supplier.create({
    data: { name },
  });
  res.json(supplier);
});

export default router;
