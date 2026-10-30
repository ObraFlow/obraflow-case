/**
 * Constantes e helpers para os testes E2E.
 *
 * Os IDs de obra/fornecedor NÃO são hardcoded: são resolvidos via API no
 * beforeAll de cada spec, porque o DemoDataSeeder gera UUIDs novos a cada
 * seed (banco vazio). Aqui ficam apenas os rótulos estáveis (código/nome).
 */

export const SENHA_DEMO = 'obraflow123';

export const USUARIOS = {
  amanda: {
    email: 'amanda.souza@obraflow.com.br',
    nome: 'Amanda Souza',
    papeis: ['ADMIN', 'APROVADOR'],
  },
  joao: {
    email: 'joao.lima@obraflow.com.br',
    nome: 'Joao Pedro Lima',
    papeis: ['APROVADOR'],
  },
  carlos: {
    email: 'carlos.menezes@obraflow.com.br',
    nome: 'Carlos Menezes',
    papeis: ['COMPRADOR'],
  },
} as const;

export type UsuarioDemo = (typeof USUARIOS)[keyof typeof USUARIOS];

export const OBRAS = {
  /** Edificio Horizonte — faixas [0,10k) Amanda; [10k,∞) Amanda→João */
  obra1: { codigo: 'OBRA-001', nome: 'Edificio Horizonte' },
  /** Residencia Vila Nova — faixas [0,5k) Patricia; [5k,∞) Patricia→Bruno */
  obra2: { codigo: 'OBRA-002', nome: 'Residencia Vila Nova' },
  /** Reforma Centro Historico — faixas [0,1k) Bruno; [25k,∞) Amanda→João→Patricia (GAP 1k–25k) */
  obra3: { codigo: 'OBRA-003', nome: 'Reforma Centro Historico' },
} as const;

export const FORNECEDORES = {
  cimentos: 'Cimentos ABC Ltda',
  ferragens: 'Ferragens Silva & Cia',
  pisos: 'Pisos e Revestimentos Norte',
} as const;

export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
