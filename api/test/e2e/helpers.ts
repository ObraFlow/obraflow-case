import { inject } from 'vitest';

const baseUrl = inject('baseUrl');

export interface ApiResponse<T = any> {
  status: number;
  headers: Headers;
  body: T;
}

/** JSON request to the API under test. `cookie` is a session from login(). */
export async function api<T = any>(
  method: string,
  path: string,
  options: {
    body?: unknown;
    cookie?: string;
    headers?: Record<string, string>;
  } = {},
): Promise<ApiResponse<T>> {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(options.cookie && { cookie: options.cookie }),
      ...options.headers,
    },
    body:
      options.body === undefined
        ? undefined
        : typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body),
  });
  const text = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    body: text ? JSON.parse(text) : undefined,
  };
}

/** Ids of the demo data (see prisma/seed.ts), looked up by name and code. */
export async function demoData() {
  const users = (await api('GET', '/users')).body as {
    id: string;
    name: string;
  }[];
  const sites = (await api('GET', '/construction-sites')).body as {
    id: string;
    code: string;
  }[];
  const suppliers = (await api('GET', '/suppliers')).body as { id: string }[];
  const userId = (firstName: string) =>
    users.find((user) => user.name.startsWith(firstName))!.id;
  const siteId = (code: string) => sites.find((site) => site.code === code)!.id;
  return { userId, siteId, supplierId: suppliers[0].id };
}

/** Session cookie for a user, as the browser would get it from POST /session. */
export async function login(userId: string) {
  const response = await fetch(`${baseUrl}/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return response.headers.get('set-cookie')!.split(';')[0];
}

export const item = (quantity: string, unitPrice: string) => ({
  description: 'Item de teste',
  quantity,
  unit: 'un',
  unitPrice,
});
