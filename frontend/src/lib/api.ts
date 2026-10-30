const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

// No browser, passa pelo rewrite do Next.js (/api/backend/* -> backend/api/v1/*)
// para evitar bloqueio de CORS. No servidor, chama o backend direto.
function resolveBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return '/api/backend';
  }
  return BACKEND_URL;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public data?: unknown
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  tags: string[] = [],
  accessToken?: string
): Promise<T> {
  const base = resolveBaseUrl();
  const url = base === '/api/backend' ? `${base}${path}` : `${base}/api/v1${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...options.headers,
    },
    next: { tags },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(res.status, errorData.detail || res.statusText, errorData);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export interface UserProfile {
  id: string;
  nome: string;
  email: string;
  cargo: string | null;
  papeis: string[];
}

// Helpers tipados
export const api = {
  // Auth
  login: (email: string, senha: string) =>
    apiFetch<{ accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    }),

  me: (accessToken?: string) => apiFetch<UserProfile>('/auth/me', {}, ['user'], accessToken),

  // Obras
  getObras: (accessToken?: string) => apiFetch<ObraResultado[]>('/obras', {}, ['obras'], accessToken),
  getObra: (id: string, accessToken?: string) => apiFetch<ObraResultado>(`/obras/${id}`, {}, [`obra-${id}`], accessToken),
  createObra: (data: CreateObraInput, accessToken?: string) =>
    apiFetch<ObraResultado>('/obras', { method: 'POST', body: JSON.stringify(data) }, ['obras'], accessToken),

  // Fornecedores
  getFornecedores: (accessToken?: string) => apiFetch<FornecedorResultado[]>('/fornecedores', {}, ['fornecedores'], accessToken),
  getFornecedor: (id: string, accessToken?: string) => apiFetch<FornecedorResultado>(`/fornecedores/${id}`, {}, [`fornecedor-${id}`], accessToken),
  createFornecedor: (data: CreateFornecedorInput, accessToken?: string) =>
    apiFetch<FornecedorResultado>('/fornecedores', { method: 'POST', body: JSON.stringify(data) }, ['fornecedores'], accessToken),

  // Pedidos
  getPedidos: (filters: PedidoFilters = {}, accessToken?: string) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    return apiFetch<PedidoPaginaResultado>(`/pedidos?${params.toString()}`, {}, ['pedidos'], accessToken);
  },

  getPedido: (id: string, accessToken?: string) => apiFetch<PedidoResultado>(`/pedidos/${id}`, {}, [`pedido-${id}`], accessToken),

  createPedido: (data: CreatePedidoInput, accessToken?: string) =>
    apiFetch<PedidoResultado>('/pedidos', { method: 'POST', body: JSON.stringify(data) }, ['pedidos'], accessToken),

  approvePedido: (id: string, accessToken?: string) =>
    apiFetch<void>(`/pedidos/${id}/decisoes`, { method: 'POST', body: JSON.stringify({ decisao: 'APROVADO' }) }, [], accessToken),

  rejectPedido: (id: string, motivo: string, accessToken?: string) =>
    apiFetch<void>(`/pedidos/${id}/decisoes`, {
      method: 'POST',
      body: JSON.stringify({ decisao: 'REJEITADO', motivo }),
    }, [], accessToken),

  deletePedido: (id: string, accessToken?: string) =>
    apiFetch<void>(`/pedidos/${id}`, { method: 'DELETE' }, ['pedidos'], accessToken),

  // Alcadas
  getNiveis: (obraId: string, accessToken?: string) => apiFetch<NivelAlcadaResultado[]>(`/obras/${obraId}/niveis`, {}, [`niveis-${obraId}`], accessToken),

  createNivel: (obraId: string, data: NivelAlcadaInput, accessToken?: string) =>
    apiFetch<NivelAlcadaResultado>(`/obras/${obraId}/niveis`, { method: 'POST', body: JSON.stringify(data) }, [`niveis-${obraId}`], accessToken),

  updateNivel: (nivelId: string, data: NivelAlcadaInput, accessToken?: string) =>
    apiFetch<NivelAlcadaResultado>(`/niveis/${nivelId}`, { method: 'PUT', body: JSON.stringify(data) }, [`niveis-${data.obraId}`], accessToken),

  deleteNivel: (nivelId: string, obraId: string, accessToken?: string) =>
    apiFetch<void>(`/niveis/${nivelId}`, { method: 'DELETE' }, [`niveis-${obraId}`], accessToken),

  simulacao: (nivelId: string, valor: number, accessToken?: string) =>
    apiFetch<SimulacaoAlcadaResultado>(`/niveis/${nivelId}/simulacao?valor=${valor}`, {}, [], accessToken),

  // Usuários
  getUsuarios: (accessToken?: string) => apiFetch<UsuarioResultado[]>('/usuarios', {}, ['usuarios'], accessToken),
};

// Named exports for use in Server Components and forms
export const getObras = (accessToken?: string) => api.getObras(accessToken);
export const getObra = (id: string, accessToken?: string) => api.getObra(id, accessToken);
export const getFornecedores = (accessToken?: string) => api.getFornecedores(accessToken);
export const getPedidos = (filters: PedidoFilters = {}, accessToken?: string) => api.getPedidos(filters, accessToken);
export const getPedido = (id: string, accessToken?: string) => api.getPedido(id, accessToken);
export const createPedido = (data: CreatePedidoInput, accessToken?: string) => api.createPedido(data, accessToken);
export const getNiveis = (obraId: string, accessToken?: string) => api.getNiveis(obraId, accessToken);
export const getUsuarios = (accessToken?: string) => api.getUsuarios(accessToken);

// Types (mirror backend DTOs)
export interface UsuarioResultado {
  id: string;
  nome: string;
  email: string;
  cargo: string | null;
  papeis: string[];
  ativo: boolean;
  criadoEm: string;
}

export interface ObraResultado {
  id: string;
  codigo: string;
  nome: string;
  endereco: string | null;
  status: 'ATIVA' | 'INATIVA';
  criadoEm: string;
}

export interface FornecedorResultado {
  id: string;
  nome: string;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  ativo: boolean;
  criadoEm: string;
}

export interface CreateObraInput {
  codigo: string;
  nome: string;
  endereco: string;
}

export interface CreateFornecedorInput {
  nome: string;
  documento: string;
  email: string;
  telefone: string;
}

export interface PedidoFilters {
  situacao?: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
  obraId?: string;
  fornecedorId?: string;
  aprovadorId?: string;
  busca?: string;
  aguardandoDecisaoDe?: string;
  pagina?: number;
  tamanho?: number;
}

export interface PedidoPaginaResultado {
  conteudo: PedidoListaResultado[];
  pagina: number;
  tamanho: number;
  totalElementos: number;
  totalPaginas: number;
}

export interface PedidoListaResultado {
  id: string;
  numero: string;
  obraCodigo: string;
  obraNome: string;
  fornecedorNome: string;
  dataPedido: string;
  quantidadeItens: number;
  valorTotal: number;
  situacao: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
  alcada: AlcadaListaResultado;
  solicitanteId?: string;
}

export interface AlcadaListaResultado {
  etapaAtual: number;
  totalEtapas: number;
  aprovadorAtual: AprovadorResumo | null;
  etapasConcluidas: EtapaResultado[];
  proximasEtapas: AprovadorResumo[];
}

export interface AprovadorResumo {
  usuarioId: string;
  usuarioNome: string | null;
}

export interface EtapaResultado {
  ordem: number;
  aprovador: AprovadorResumo;
  situacao: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
  motivo: string | null;
  decididoEm: string | null;
}

export interface PedidoResultado {
  id: string;
  numero: string;
  obra: ObraResultado;
  fornecedor: FornecedorResultado;
  dataPedido: string;
  observacoes: string | null;
  valorTotal: number;
  quantidadeItens: number;
  situacao: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
  etapaAtual: number;
  totalEtapas: number;
  itens: PedidoItemResultado[];
  alcada: AlcadaResultado;
  criadoEm: string;
}

export interface PedidoItemResultado {
  descricao: string;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
  total: number;
}

export interface AlcadaResultado {
  nivelOrigemId: string;
  faixaRotulo: string | null;
  limiteInferior: number | null;
  limiteSuperior: number | null;
  etapaAtual: number;
  totalEtapas: number;
  aprovadorAtual: AprovadorResumo | null;
  etapas: EtapaResultado[];
}

export interface CreatePedidoInput {
  obraId: string;
  fornecedorId: string;
  dataPedido: string;
  observacoes: string | null;
  itens: ItemPedidoInput[];
}

export interface ItemPedidoInput {
  descricao: string;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
}

export interface NivelAlcadaResultado {
  id: string;
  obraId: string;
  limiteInferior: number;
  limiteSuperior: number | null;
  rotulo: string | null;
  descricao: string | null;
  aprovadores: AprovadorResultado[];
}

export interface AprovadorResultado {
  ordem: number;
  usuarioId: string;
  usuarioNome: string | null;
}

export interface NivelAlcadaInput {
  obraId: string;
  limiteInferior: number;
  limiteSuperior: number | null;
  descricao: string | null;
  usuariosAprovadores: string[];
}

export interface SimulacaoAlcadaResultado {
  valor: number;
  aplicavel: boolean;
  nivelId: string | null;
  faixaRotulo: string | null;
  cadeia: AprovadorResultado[];
}