import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { DomainError } from "@/server/domain/errors";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

/** Envolve um handler e converte erros em respostas { message } com o status certo. */
export function handle<C>(fn: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof DomainError) return json({ message: e.message }, e.status);
      if (e instanceof ZodError) return json({ message: e.issues[0]?.message ?? "Dados inválidos." }, 400);
      console.error(e);
      return json({ message: "Erro interno do servidor." }, 500);
    }
  };
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new DomainError(400, "Corpo da requisição inválido (JSON esperado).");
  }
}

export function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new DomainError(400, "Identificador inválido.");
  return id;
}

export function requireUserId(req: Request): number {
  const n = Number(req.headers.get("x-user-id"));
  const id = Number.isInteger(n) && n > 0 ? n : null;
  if (!id) throw new DomainError(401, "Selecione o usuário em “Atuando como” antes de decidir.");
  return id;
}
