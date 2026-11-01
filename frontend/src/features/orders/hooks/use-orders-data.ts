'use client';

import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { API_ROUTES } from '@/constants/api-routes';
import { apiRequest } from '@/lib/client';
import { Order } from '@/types/obraflow';

const orderSchema = z.array(
  z.object({
    id: z.number(),
    status: z.string(),
    orderDate: z.string(),
    totalCents: z.number(),
    work: z.string(),
    supplier: z.string(),
  }),
);

export function useOrdersData() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiRequest<Order[]>(
        API_ROUTES.orders.list,
        orderSchema,
      );
      setOrders(response.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'API indisponível.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { orders, loading, error, reload };
}
