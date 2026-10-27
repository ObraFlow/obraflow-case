/**
 * Thin fetch wrapper for the API. Requests go to /api on the same origin
 * (Vite proxies them in development), so the browser sends the session
 * cookie automatically. Failures become an ApiError with a message that can
 * be shown to the user as is.
 */

export class ApiError extends Error {
  readonly status: number
  /** Field-level messages from validation errors (400). */
  readonly details: string[]

  constructor(status: number, message: string, details: string[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }

  /** Network failure or server error: worth offering "try again". */
  get isServerProblem() {
    return this.status === 0 || this.status >= 500
  }
}

type Query = Record<string, string | number | undefined | null>

interface RequestOptions {
  body?: unknown
  query?: Query
  headers?: Record<string, string>
}

const SERVER_DOWN =
  'Não foi possível falar com o servidor. Verifique se a API está no ar e tente novamente.'

function buildUrl(path: string, query?: Query) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    // Empty filters are left out: the API rejects e.g. siteId="".
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  }
  const search = params.toString()
  return `/api${path}${search ? `?${search}` : ''}`
}

function messageFrom(status: number, body: unknown): { message: string; details: string[] } {
  const raw = (body as { message?: unknown } | null)?.message
  const details = Array.isArray(raw) ? raw.map(String) : []
  if (status >= 500 || status === 0) {
    return { message: SERVER_DOWN, details }
  }
  if (typeof raw === 'string') {
    return { message: raw, details }
  }
  if (details.length > 0) {
    return { message: `Dados inválidos: ${details.join('; ')}`, details }
  }
  return { message: `Erro inesperado (${status}).`, details }
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers: {
        ...(options.body !== undefined && { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiError(0, SERVER_DOWN)
  }

  if (response.status === 204) {
    return undefined as T
  }
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const { message, details } = messageFrom(response.status, body)
    throw new ApiError(response.status, message, details)
  }
  return body as T
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>('POST', path, { body, headers }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  delete: (path: string) => request<void>('DELETE', path),
}
