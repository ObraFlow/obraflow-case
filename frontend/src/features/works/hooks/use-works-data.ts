'use client';

import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { API_ROUTES } from '@/constants/api-routes';
import { apiRequest } from '@/lib/client';
import { Option } from '@/types/obraflow';

const worksSchema = z.array(z.object({ id: z.number(), name: z.string() }));

export function useWorksData() {
  const [works, setWorks] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiRequest<Option[]>(
        API_ROUTES.works.list,
        worksSchema,
      );
      setWorks(response.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'API indisponível.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { works, loading, error, reload };
}
