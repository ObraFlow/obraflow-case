import { http, HttpResponse } from 'msw';
import { ObraResultado, FornecedorResultado, UsuarioResultado } from '@/lib/api';

const BASE = process.env.BACKEND_URL || 'http://localhost:8080';

// Registra cada rota nos dois caminhos possíveis:
// - `${BASE}/api/v1/*`  (chamada direta, server-side)
// - `/api/backend/*`    (proxy do Next.js usado no browser, sem CORS)
const PREFIXES = [`${BASE}/api/v1`, '/api/backend'];

function get(path: string, resolver: Parameters<typeof http.get>[1]) {
  return PREFIXES.map((prefix) => http.get(prefix + path, resolver));
}
function post(path: string, resolver: Parameters<typeof http.post>[1]) {
  return PREFIXES.map((prefix) => http.post(prefix + path, resolver));
}
function put(path: string, resolver: Parameters<typeof http.put>[1]) {
  return PREFIXES.map((prefix) => http.put(prefix + path, resolver));
}
function del(path: string, resolver: Parameters<typeof http.delete>[1]) {
  return PREFIXES.map((prefix) => http.delete(prefix + path, resolver));
}

const mockObras: ObraResultado[] = [
  { id: '1', codigo: 'OBRA-001', nome: 'Edifício Horizonte', endereco: 'Av. Paulista, 1000', status: 'ATIVA', criadoEm: '2026-01-01' },
  { id: '2', codigo: 'OBRA-002', nome: 'Residência Vila Nova', endereco: 'Rua das Acácias, 250', status: 'ATIVA', criadoEm: '2026-01-01' },
];

const mockFornecedores: FornecedorResultado[] = [
  { id: '1', nome: 'Cimentos ABC Ltda', documento: '12.345.678/0001-90', email: 'comercial@cimentoabc.com', telefone: '(11) 3555-1020', ativo: true, criadoEm: '2026-01-01' },
  { id: '2', nome: 'Ferragens Silva & Cia', documento: '98.765.432/0001-11', email: 'vendas@ferragenssilva.com', telefone: '(11) 3444-5566', ativo: true, criadoEm: '2026-01-01' },
];

const mockUsuarios: UsuarioResultado[] = [
  { id: '1', nome: 'Amanda Souza', email: 'amanda@teste.com', cargo: 'Engenheira', papeis: ['ADMIN', 'APROVADOR'], ativo: true, criadoEm: '2026-01-01' },
  { id: '2', nome: 'João Lima', email: 'joao@teste.com', cargo: 'Diretor', papeis: ['APROVADOR'], ativo: true, criadoEm: '2026-01-01' },
];

const mockPedidos: any[] = [
  {
    id: '1',
    numero: 'PC-2026-000001',
    obra: { id: '1', codigo: 'OBRA-001', nome: 'Edifício Horizonte', endereco: 'Av. Paulista, 1000', status: 'ATIVA', criadoEm: '2026-01-01' },
    fornecedor: { id: '1', nome: 'Cimentos ABC Ltda', documento: '12.345.678/0001-90', email: 'comercial@cimentoabc.com', telefone: '(11) 3555-1020', ativo: true, criadoEm: '2026-01-01' },
    dataPedido: '2026-01-15',
    observacoes: 'Teste',
    valorTotal: 5000,
    quantidadeItens: 2,
    situacao: 'PENDENTE',
    etapaAtual: 1,
    totalEtapas: 2,
    itens: [
      { descricao: 'Cimento', quantidade: 100, unidade: 'sc', precoUnitario: 32.90, total: 3290 },
      { descricao: 'Areia', quantidade: 30, unidade: 'm3', precoUnitario: 95, total: 2850 },
    ],
    alcada: {
      nivelOrigemId: '1',
      faixaRotulo: 'Até R$ 10.000,00',
      limiteInferior: 0,
      limiteSuperior: 10000,
      etapaAtual: 1,
      totalEtapas: 1,
      aprovadorAtual: { usuarioId: '1', usuarioNome: 'Amanda Souza' },
      etapas: [
        { ordem: 1, aprovador: { usuarioId: '1', usuarioNome: 'Amanda Souza' }, situacao: 'PENDENTE', motivo: null, decididoEm: null },
      ],
    },
    criadoEm: '2026-01-15',
  },
];

const loginHandler = async ({ request }: { request: Request }) => {
  const body = (await request.json()) as any;
  if (body.email === 'amanda@teste.com' && body.senha === 'obraflow123') {
    return HttpResponse.json({ accessToken: 'mock-jwt-token' });
  }
  return HttpResponse.json({ detail: 'Credenciais inválidas' }, { status: 401 });
};

const meHandler = ({ request }: { request: Request }) => {
  const auth = request.headers.get('Authorization');
  if (auth === 'Bearer mock-jwt-token') {
    return HttpResponse.json({
      id: '1',
      nome: 'Amanda Souza',
      email: 'amanda@teste.com',
      cargo: 'Engenheira',
      papeis: ['ADMIN', 'APROVADOR'],
      ativo: true,
      criadoEm: '2026-01-01',
    });
  }
  return HttpResponse.json({ detail: 'Não autorizado' }, { status: 401 });
};

export const handlers = [
  // Auth
  ...post('/auth/login', loginHandler),
  ...get('/auth/me', meHandler),

  // Obras
  ...get('/obras', () => HttpResponse.json(mockObras)),
  ...get('/obras/:id', ({ params }) => {
    const obra = mockObras.find(o => o.id === params.id);
    if (obra) return HttpResponse.json(obra);
    return HttpResponse.json({ detail: 'Não encontrado' }, { status: 404 });
  }),

  // Fornecedores
  ...get('/fornecedores', () => HttpResponse.json(mockFornecedores)),
  ...get('/fornecedores/:id', ({ params }) => {
    const forn = mockFornecedores.find(f => f.id === params.id);
    if (forn) return HttpResponse.json(forn);
    return HttpResponse.json({ detail: 'Não encontrado' }, { status: 404 });
  }),

  // Usuários
  ...get('/usuarios', () => HttpResponse.json(mockUsuarios)),

  // Pedidos
  ...get('/pedidos', ({ request }) => {
    const url = new URL(request.url);
    const situacao = url.searchParams.get('situacao');
    const obraId = url.searchParams.get('obraId');
    const pagina = parseInt(url.searchParams.get('pagina') || '0');
    const tamanho = parseInt(url.searchParams.get('tamanho') || '20');

    let pedidos = mockPedidos;
    if (situacao) pedidos = pedidos.filter(p => p.situacao === situacao);
    if (obraId) pedidos = pedidos.filter(p => p.obra.id === obraId);

    const start = pagina * tamanho;
    const end = start + tamanho;
    const paginated = pedidos.slice(start, end);

    return HttpResponse.json({
      conteudo: paginated,
      pagina,
      tamanho,
      totalElementos: pedidos.length,
      totalPaginas: Math.max(1, Math.ceil(pedidos.length / tamanho)),
    });
  }),

  ...get('/pedidos/:id', ({ params }) => {
    const pedido = mockPedidos.find(p => p.id === params.id);
    if (pedido) return HttpResponse.json(pedido);
    return HttpResponse.json({ detail: 'Não encontrado' }, { status: 404 });
  }),

  ...post('/pedidos', async ({ request }) => {
    const body = (await request.json()) as any;
    const newPedido = {
      id: '2',
      numero: 'PC-2026-000002',
      ...body,
      valorTotal: body.itens.reduce((sum: number, item: any) => sum + item.quantidade * item.precoUnitario, 0),
      quantidadeItens: body.itens.length,
      situacao: 'PENDENTE',
      etapaAtual: 1,
      totalEtapas: 1,
      itens: body.itens.map((item: any) => ({
        ...item,
        total: item.quantidade * item.precoUnitario,
      })),
      alcada: {
        nivelOrigemId: '1',
        faixaRotulo: 'Até R$ 10.000,00',
        limiteInferior: 0,
        limiteSuperior: 10000,
        etapaAtual: 1,
        totalEtapas: 1,
        aprovadorAtual: { usuarioId: '1', usuarioNome: 'Amanda Souza' },
        etapas: [{ ordem: 1, aprovador: { usuarioId: '1', usuarioNome: 'Amanda Souza' }, situacao: 'PENDENTE', motivo: null, decididoEm: null }],
      },
      criadoEm: new Date().toISOString(),
    };
    mockPedidos.push(newPedido);
    return HttpResponse.json(newPedido, { status: 201 });
  }),

  ...post('/pedidos/:id/decisoes', async ({ params, request }) => {
    const body = (await request.json()) as any;
    const pedido = mockPedidos.find(p => p.id === params.id);
    if (!pedido) return HttpResponse.json({ detail: 'Não encontrado' }, { status: 404 });

    if (body.decisao === 'APROVADO') {
      pedido.situacao = 'APROVADO';
      pedido.etapaAtual = pedido.totalEtapas;
      const etapa = pedido.alcada.etapas[0];
      etapa.situacao = 'APROVADO';
      etapa.decididoEm = new Date().toISOString();
    } else if (body.decisao === 'REJEITADO') {
      if (!body.motivo) {
        return HttpResponse.json({ detail: 'Motivo é obrigatório' }, { status: 422 });
      }
      pedido.situacao = 'REJEITADO';
      const etapa = pedido.alcada.etapas[0];
      etapa.situacao = 'REJEITADO';
      etapa.motivo = body.motivo;
      etapa.decididoEm = new Date().toISOString();
    }
    return HttpResponse.json(pedido);
  }),

  // Alcadas
  ...get('/obras/:obraId/niveis', ({ params }) => {
    return HttpResponse.json([
      {
        id: '1',
        obraId: params.obraId,
        limiteInferior: 0, limiteSuperior: 10000, rotulo: 'Até R$ 10.000,00',
        descricao: 'Compras de pequeno valor',
        aprovadores: [{ ordem: 1, usuarioId: '1', usuarioNome: 'Amanda Souza' }],
      },
      {
        id: '2',
        obraId: params.obraId,
        limiteInferior: 10000, limiteSuperior: null, rotulo: 'Acima de R$ 10.000,00',
        descricao: 'Compras acima de 10.000',
        aprovadores: [
          { ordem: 1, usuarioId: '1', usuarioNome: 'Amanda Souza' },
          { ordem: 2, usuarioId: '2', usuarioNome: 'João Lima' },
        ],
      },
    ]);
  }),

  ...post('/obras/:obraId/niveis', async ({ params, request }) => {
    const body = (await request.json()) as any;
    const newNivel = {
      id: '3',
      obraId: params.obraId,
      limiteInferior: body.limiteInferior,
      limiteSuperior: body.limiteSuperior ?? null,
      rotulo: `De ${body.limiteInferior} até ${body.limiteSuperior ?? '∞'}`,
      descricao: body.descricao ?? null,
      aprovadores: body.usuariosAprovadores.map((id: string, idx: number) => ({
        usuarioId: id,
        usuarioNome: 'Usuário',
        ordem: idx + 1,
      })),
    };
    return HttpResponse.json(newNivel, { status: 201 });
  }),

  ...put('/niveis/:id', async ({ params, request }) => {
    const body = (await request.json()) as any;
    return HttpResponse.json({
      id: params.id,
      obraId: body.obraId,
      limiteInferior: body.limiteInferior,
      limiteSuperior: body.limiteSuperior ?? null,
      rotulo: `De ${body.limiteInferior} até ${body.limiteSuperior ?? '∞'}`,
      descricao: body.descricao ?? null,
      aprovadores: body.usuariosAprovadores.map((id: string, idx: number) => ({
        usuarioId: id,
        usuarioNome: 'Usuário',
        ordem: idx + 1,
      })),
    });
  }),

  ...del('/niveis/:id', () => new HttpResponse(null, { status: 204 }) as never),

  ...get('/niveis/:id/simulacao', ({ params, request }) => {
    const url = new URL(request.url);
    const valor = parseFloat(url.searchParams.get('valor') || '0');
    return HttpResponse.json({
      valor,
      aplicavel: true,
      nivelId: params.id,
      faixaRotulo: 'Acima de R$ 10.000,00',
      cadeia: [
        { ordem: 1, usuarioId: '1', usuarioNome: 'Amanda Souza' },
        { ordem: 2, usuarioId: '2', usuarioNome: 'João Lima' },
      ],
    });
  }),
];
