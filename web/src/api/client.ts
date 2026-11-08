export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: Array<{ path: string; message: string }> = [],
  ) {
    super(message)
  }

  // status 0 = nem chegou no servidor (offline, backend parado)
  get isUnavailable() {
    return this.status === 0 || this.status >= 500
  }
}

let actorId: number | null = null
export const setActorHeader = (id: number | null) => {
  actorId = id
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['content-type'] = 'application/json'
  if (actorId) headers['x-user-id'] = String(actorId)

  let res: Response
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new ApiError(0, 'NETWORK', 'Não foi possível falar com o servidor. Verifique se a API está rodando.')
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err = data?.error
    // o proxy do Vite responde 500/502 sem corpo quando o backend está parado
    if (!err) throw new ApiError(res.status, 'UNAVAILABLE', 'O servidor não respondeu como esperado. Tente novamente.')
    throw new ApiError(res.status, err.code, err.message, err.details)
  }
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
