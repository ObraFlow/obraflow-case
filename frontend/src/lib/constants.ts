export const ROLES = {
  ADMIN: 'ADMIN',
  COMPRADOR: 'COMPRADOR',
  APROVADOR: 'APROVADOR',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.ADMIN]: 'Administrador',
  [ROLES.COMPRADOR]: 'Comprador',
  [ROLES.APROVADOR]: 'Aprovador',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  [ROLES.ADMIN]: 'Acesso total ao sistema, gerencia usuários e configurações',
  [ROLES.COMPRADOR]: 'Pode criar pedidos de compra',
  [ROLES.APROVADOR]: 'Pode aprovar ou rejeitar pedidos na alçada',
};

export const SITUACAO_PEDIDO = {
  PENDENTE: 'PENDENTE' as const,
  APROVADO: 'APROVADO' as const,
  REJEITADO: 'REJEITADO' as const,
};

export type SituacaoPedido = (typeof SITUACAO_PEDIDO)[keyof typeof SITUACAO_PEDIDO];

export const SITUACAO_LABELS: Record<SituacaoPedido, string> = {
  [SITUACAO_PEDIDO.PENDENTE]: 'Pendente',
  [SITUACAO_PEDIDO.APROVADO]: 'Aprovado',
  [SITUACAO_PEDIDO.REJEITADO]: 'Rejeitado',
};

export const SITUACAO_VARIANTS: Record<SituacaoPedido, 'pending' | 'approved' | 'rejected'> = {
  [SITUACAO_PEDIDO.PENDENTE]: 'pending',
  [SITUACAO_PEDIDO.APROVADO]: 'approved',
  [SITUACAO_PEDIDO.REJEITADO]: 'rejected',
};

export const STATUS_OBRA = {
  ATIVA: 'ATIVA' as const,
  INATIVA: 'INATIVA' as const,
};

export type StatusObra = (typeof STATUS_OBRA)[keyof typeof STATUS_OBRA];

export const STATUS_OBRA_LABELS: Record<StatusObra, string> = {
  [STATUS_OBRA.ATIVA]: 'Ativa',
  [STATUS_OBRA.INATIVA]: 'Inativa',
};

export const DECISAO = {
  APROVADO: 'APROVADO' as const,
  REJEITADO: 'REJEITADO' as const,
};

export type Decisao = (typeof DECISAO)[keyof typeof DECISAO];

export const DECISAO_LABELS: Record<Decisao, string> = {
  [DECISAO.APROVADO]: 'Aprovar',
  [DECISAO.REJEITADO]: 'Rejeitar',
};

export const SITUACAO_ETAPA = {
  PENDENTE: 'PENDENTE' as const,
  APROVADO: 'APROVADO' as const,
  REJEITADO: 'REJEITADO' as const,
};

export type SituacaoEtapa = (typeof SITUACAO_ETAPA)[keyof typeof SITUACAO_ETAPA];

export const SITUACAO_ETAPA_LABELS: Record<SituacaoEtapa, string> = {
  [SITUACAO_ETAPA.PENDENTE]: 'Pendente',
  [SITUACAO_ETAPA.APROVADO]: 'Aprovado',
  [SITUACAO_ETAPA.REJEITADO]: 'Rejeitado',
};

export const SITUACAO_ETAPA_ICONS: Record<SituacaoEtapa, string> = {
  [SITUACAO_ETAPA.PENDENTE]: 'circle',
  [SITUACAO_ETAPA.APROVADO]: 'check-circle-2',
  [SITUACAO_ETAPA.REJEITADO]: 'x-circle',
};

export const PAGINACAO_TAMANHO = [10, 20, 50, 100] as const;
export const PAGINACAO_PADRAO = 20;

export const TOAST_DURATION = 4000;
export const DEBOUNCE_DELAY = 300;
export const ANIMATION_DURATION = 200;

export const API_ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    ME: '/auth/me',
  },
  OBRAS: '/obras',
  FORNECEDORES: '/fornecedores',
  PEDIDOS: '/pedidos',
  ALCADAS: '/obras/{obraId}/niveis',
  NIVEIS: '/niveis',
  AUTH_NEXTAUTH: '/api/auth',
} as const;

export const QUERY_KEYS = {
  USER: ['user'] as const,
  OBRAS: ['obras'] as const,
  OBRA: (id: string) => ['obra', id] as const,
  FORNECEDORES: ['fornecedores'] as const,
  PEDIDOS: (filters?: Record<string, unknown>) => ['pedidos', filters] as const,
  PEDIDO: (id: string) => ['pedido', id] as const,
  NIVEIS: (obraId: string) => ['niveis', obraId] as const,
  SIMULACAO: (nivelId: string, valor: number) => ['simulacao', nivelId, valor] as const,
} as const;