import { getToken, isCurrentToken, reportUnauthorized } from "./session";

export interface FieldIssue {
  field: string;
  code: string;
  message: string;
}
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: FieldIssue[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}
// A successful HTTP status with an unreadable body cannot prove a write failed.
// Keep this outside ApiError so existing mutation recovery treats it as uncertain.
export class InvalidApiResponse extends Error {
  constructor(readonly status: number) {
    super("Não foi possível confirmar a resposta da API. Consulte o estado atual antes de tentar novamente.");
    this.name = "InvalidApiResponse";
  }
}
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// Each request captures its session. A late 401 from a previous identity cannot
// invalidate a newly signed-in session. AuthContext alone owns token lifecycle.
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  const protectedRequest = path !== "/auth/login";
  if (token && protectedRequest) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, { ...options, headers });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(0, "NETWORK_ERROR", "Não foi possível conectar à API. Verifique sua conexão e tente novamente.");
  }
  if (!response.ok) {
    if (response.status === 401 && protectedRequest && isCurrentToken(token)) reportUnauthorized(token);
    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      if (options.signal?.aborted) throw error;
    }
    const failure = record(payload) && record(payload.error) ? payload.error : {};
    const details: FieldIssue[] = Array.isArray(failure.details)
      ? failure.details.flatMap((issue) =>
          record(issue) &&
          typeof issue.field === "string" &&
          typeof issue.code === "string" &&
          typeof issue.message === "string"
            ? [{ field: issue.field, code: issue.code, message: issue.message }]
            : [],
        )
      : [];
    throw new ApiError(
      response.status,
      typeof failure.code === "string" && failure.code ? failure.code : "REQUEST_FAILED",
      typeof failure.message === "string" && failure.message
        ? failure.message
        : "Não foi possível concluir a operação. Tente novamente.",
      details,
    );
  }
  if (response.status === 204) return undefined as T;
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new InvalidApiResponse(response.status);
  }
  // Success envelopes are objects in this API. Field-level DTO checks remain domain-owned.
  if (!record(payload)) throw new InvalidApiResponse(response.status);
  return payload as T;
}

export function errorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 403)
    return "Você não tem permissão para acessar este recurso ou executar esta ação.";
  if (error instanceof ApiError && error.status === 404)
    return "Recurso não encontrado ou indisponível para sua conta.";
  return error instanceof Error ? error.message : "Ocorreu um erro. Tente novamente.";
}

/**
 * A failed write whose result is unknown: connection lost, any 5xx, or a non-API error. Never retry such a
 * write; read the current state first.
 */
export function isUncertainOutcome(error: unknown) {
  return !(error instanceof ApiError) || error.status === 0 || error.status >= 500;
}

/** Validation messages of a 400 response, keyed by field path. */
export function fieldMessages(error: ApiError): Record<string, string> {
  return Object.fromEntries(error.details.map((issue) => [issue.field, issue.message]));
}
