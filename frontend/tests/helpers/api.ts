import { request as playwrightRequest, APIRequestContext } from '@playwright/test';
import { SENHA_DEMO, BACKEND_URL } from './seed';

const API = `${BACKEND_URL}/api/v1`;

export interface ApiSession {
  ctx: APIRequestContext;
  token: string;
  usuario: { id: string; nome: string; email: string; papeis: string[] };
}

/** Autentica direto na API do backend e retorna um contexto com Bearer pronto. */
export async function apiLogin(email: string, senha: string = SENHA_DEMO): Promise<ApiSession> {
  const ctx = await playwrightRequest.newContext();
  const res = await ctx.post(`${API}/auth/login`, {
    data: { email, senha },
  });
  if (!res.ok()) {
    throw new Error(`API login falhou (${res.status()}): ${await res.text()}`);
  }
  const data = await res.json();
  return { ctx, token: data.accessToken, usuario: data.usuario };
}

export async function getObras(session: ApiSession) {
  const res = await session.ctx.get(`${API}/obras`, {
    headers: { Authorization: `Bearer ${session.token}` },
  });
  if (!res.ok()) throw new Error(`GET /obras falhou: ${res.status()}`);
  return res.json() as Promise<Array<{ id: string; codigo: string; nome: string }>>;
}

export async function getFornecedores(session: ApiSession) {
  const res = await session.ctx.get(`${API}/fornecedores`, {
    headers: { Authorization: `Bearer ${session.token}` },
  });
  if (!res.ok()) throw new Error(`GET /fornecedores falhou: ${res.status()}`);
  return res.json() as Promise<Array<{ id: string; nome: string }>>;
}

export interface ItemPedido {
  descricao: string;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
}

export interface CriarPedidoInput {
  obraId: string;
  fornecedorId: string;
  dataPedido?: string;
  observacoes?: string | null;
  itens: ItemPedido[];
}

export async function criarPedido(session: ApiSession, input: CriarPedidoInput) {
  const res = await session.ctx.post(`${API}/pedidos`, {
    headers: { Authorization: `Bearer ${session.token}` },
    data: {
      dataPedido: input.dataPedido ?? new Date().toISOString().slice(0, 10),
      observacoes: input.observacoes ?? null,
      ...input,
    },
  });
  if (!res.ok()) {
    throw new Error(`POST /pedidos falhou (${res.status()}): ${await res.text()}`);
  }
  return res.json() as Promise<{ id: string; numero: string; situacao: string; valorTotal: number }>;
}

export async function criarObra(session: ApiSession, codigo: string, nome: string) {
  const res = await session.ctx.post(`${API}/obras`, {
    headers: { Authorization: `Bearer ${session.token}` },
    data: { codigo, nome, endereco: 'Obra criada pelos testes E2E' },
  });
  if (!res.ok()) {
    throw new Error(`POST /obras falhou (${res.status()}): ${await res.text()}`);
  }
  return res.json() as Promise<{ id: string; codigo: string; nome: string }>;
}

export async function dispose(session: ApiSession) {
  await session.ctx.dispose();
}
