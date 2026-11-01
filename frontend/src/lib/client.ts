import { z } from 'zod';

import { API_ROUTES } from '@/constants/api-routes';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message: string;
};

export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.message ?? 'Não foi possível concluir a operação.');
  }

  if (!body || typeof body !== 'object' || !('success' in body)) {
    throw new Error('Resposta inválida da API.');
  }

  const apiResponse = body as {
    success: boolean;
    data: unknown;
    message?: string;
  };

  if (!apiResponse.success) {
    throw new Error(apiResponse.message ?? 'Não foi possível concluir a operação.');
  }

  return {
    success: true,
    data: schema.parse(apiResponse.data),
    message: apiResponse.message ?? '',
  };
}

export { API_ROUTES };
