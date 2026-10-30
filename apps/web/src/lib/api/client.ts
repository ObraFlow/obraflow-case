import type { ErrorCode, ErrorDetail } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';

/** Erro no formato do contrato ({ statusCode, code, message, details }), pronto para a UI. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details: ErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Mensagem do campo (ex.: "items.1.quantity"), para mostrar o erro no lugar certo. */
  fieldError(field: string): string | undefined {
    return this.details.find((detail) => detail.field === field)?.message;
  }
}

type QueryValue = string | number | boolean | null | undefined;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
}

/**
 * Chamada à API. Sucesso → corpo tipado; erro → ApiError com a mensagem da API
 * (ou uma mensagem amigável quando a API nem respondeu).
 */
export async function api<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers:
        options.body === undefined
          ? undefined
          : { 'Content-Type': 'application/json' },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      throw error;
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Não foi possível conectar ao servidor. Verifique se a API está no ar e tente novamente.',
    );
  }

  if (response.status === 204) return undefined as T;

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw toApiError(response.status, body);
  return body as T;
}

function toApiError(status: number, body: unknown): ApiError {
  if (body && typeof body === 'object' && 'code' in body && 'message' in body) {
    const { code, message, details } = body as {
      code: ErrorCode;
      message: string;
      details?: ErrorDetail[];
    };
    return new ApiError(status, code, message, details ?? []);
  }
  return new ApiError(
    status,
    'INTERNAL_ERROR',
    'Erro inesperado no servidor. Tente novamente.',
  );
}
