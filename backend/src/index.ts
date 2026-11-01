import express from 'express';
import cors from 'cors';
import { json } from 'body-parser';
import prisma from './lib/prisma';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(json());

// Routes will be imported here
import workRoutes from './routes/works';
import userRoutes from './routes/users';
import supplierRoutes from './routes/suppliers';
import orderRoutes from './routes/orders';
import ruleRoutes from './routes/rules';

app.use('/works', workRoutes);
app.use('/users', userRoutes);
app.use('/suppliers', supplierRoutes);
app.use('/orders', orderRoutes);
app.use('/rules', ruleRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
