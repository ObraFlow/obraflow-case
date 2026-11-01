'use client';

import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { API_ROUTES } from '@/constants/api-routes';
import { apiRequest } from '@/lib/client';
import { Rule } from '@/types/obraflow';

const ruleSchema = z.array(
  z.object({
    id: z.number(),
    minimumTotalCents: z.number(),
    maximumTotalCents: z.number().nullable(),
    approvers: z.array(
      z.object({
        userId: z.number(),
        userName: z.string(),
        position: z.number(),
      }),
    ),
  }),
);

export function useApprovalRulesData(selectedWork: string) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!selectedWork) {
      setRules([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiRequest<Rule[]>(
        API_ROUTES.approvalRules.byWork(selectedWork),
        ruleSchema,
      );
      setRules(response.data);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível carregar as regras.',
      );
    } finally {
      setLoading(false);
    }
  }, [selectedWork]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { rules, loading, error, reload };
}
