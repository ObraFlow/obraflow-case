import { randomUUID } from "node:crypto";
import { z } from "zod";

export type FieldError = { path: string; message: string };
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fieldErrors: FieldError[] = []) {
    super(message);
  }
}

export function apiJson(body: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(body, { status, headers });
}

export function parseId(value: string): string {
  return z.uuid({ error: "Informe um identificador UUID válido." }).parse(value).toLowerCase();
}

export function parseQuery<T extends z.ZodType>(request: Request, schema: T): z.output<T> {
  const values: Record<string, string> = {};
  for (const [key, value] of new URL(request.url).searchParams) {
    if (Object.hasOwn(values, key)) {
      throw new ApiError(400, "VALIDATION_ERROR", "Não repita parâmetros de consulta.", [{ path: key, message: "Informe este parâmetro apenas uma vez." }]);
    }
    Object.defineProperty(values, key, { value, enumerable: true });
  }
  return schema.parse(values);
}

export async function readJson<T extends z.ZodType>(request: Request, schema: T): Promise<z.output<T>> {
  if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Envie o corpo como application/json.");
  }
  const maximum = 256 * 1024;
  if (Number(request.headers.get("Content-Length")) > maximum) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "O conteúdo excede o limite de 256 KiB.");
  }
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > maximum) {
          await reader.cancel();
          throw new ApiError(413, "PAYLOAD_TOO_LARGE", "O conteúdo excede o limite de 256 KiB.");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let body: unknown;
  try { body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new ApiError(400, "INVALID_JSON", "O corpo JSON é inválido."); }
  return schema.parse(body);
}

export async function withApi(request: Request, handler: (actorId: string) => Promise<Response>): Promise<Response> {
  const requestId = randomUUID();
  let response: Response;
  try {
    const identity = z.uuid().safeParse(request.headers.get("X-Demo-User-Id"));
    if (!identity.success) throw new ApiError(400, "DEMO_USER_REQUIRED", "Selecione um usuário de demonstração válido.");
    const { getDatabase } = await import("@/lib/db");
    const actorId = identity.data.toLowerCase();
    if (!await getDatabase().user.findUnique({ where: { id: actorId }, select: { id: true } })) {
      throw new ApiError(404, "DEMO_USER_NOT_FOUND", "Usuário de demonstração não encontrado.");
    }
    response = await handler(actorId);
  } catch (error) {
    let failure: ApiError;
    if (error instanceof ApiError) failure = error;
    else if (error instanceof z.ZodError) {
      failure = new ApiError(400, "VALIDATION_ERROR", "Revise os campos indicados.", error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.code === "custom" ? issue.message : "Informe um valor válido para este campo.",
      })));
    } else {
      failure = new ApiError(500, "INTERNAL_ERROR", "Não foi possível concluir a operação. Tente novamente.");
      if (process.env.LOG_LEVEL !== "silent") console.error(JSON.stringify({ level: "error", event: "api_failed", requestId }));
    }
    response = apiJson({ error: { code: failure.code, message: failure.message, fieldErrors: failure.fieldErrors, requestId } }, failure.status);
  }
  response.headers.set("X-Request-Id", requestId);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
