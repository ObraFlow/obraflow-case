export interface RuleRange {
  id: string;
  minValue: number;
  maxValue: number | null; // null = faixa aberta para cima (+infinito)
  approverUserIds: string[]; // aprovadores na ordem do fluxo
}

export interface ChainStep {
  position: number;
  userId: string;
  decision: 'PENDING';
}

// o service vai traduzir isso num HTTP 422.
export class NoMatchingRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoMatchingRangeError';
  }
}

export type Decision = 'PENDING' | 'APPROVED' | 'REJECTED';
export type OrderStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type DecisionAction = 'APPROVE' | 'REJECT';

export interface OrderState {
  status: OrderStatus;
  currentStep: number;
  chain: { position: number; userId: string; decision: Decision }[];
}

export interface DecisionOutcome {
  stepPosition: number;
  stepDecision: 'APPROVED' | 'REJECTED';
  newStatus: OrderStatus;
  newCurrentStep: number;
}

// Erro de domínio com código → o service mapeia cada código para um HTTP (403/409/400).
export type ApprovalErrorCode =
  'ORDER_NOT_PENDING' | 'NOT_CURRENT_APPROVER' | 'REASON_REQUIRED';
export class ApprovalError extends Error {
  constructor(
    public readonly code: ApprovalErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApprovalError';
  }
}

// Acha a faixa que cobre `total`, ou null se nenhuma cobrir.
export function selectRange(
  ranges: RuleRange[],
  total: number,
): RuleRange | null {
  let filteredRanges = ranges.filter(
    (range) =>
      range.minValue <= total &&
      (range.maxValue === null || range.maxValue >= total),
  );

  if (filteredRanges.length > 1) {
    return filteredRanges.sort(
      (a, b) => (a.maxValue ?? Infinity) - (b.maxValue ?? Infinity),
    )[0];
  }
  return filteredRanges[0] ?? null;
}

export function resolveChain(ranges: RuleRange[], total: number): ChainStep[] {
  const range = selectRange(ranges, total);
  if (!range) {
    throw new NoMatchingRangeError(
      'Nenhuma faixa de alçada cobre o valor total deste pedido nesta obra.',
    );
  }
  // Transforma os aprovadores da faixa na cadeia inicial, preservando a ordem.
  // A anotação `: ChainStep` faz o TS tratar 'PENDING' como o literal (não string).
  return range.approverUserIds.map((userId, index): ChainStep => ({
    position: index,
    userId,
    decision: 'PENDING',
  }));
}

export function decide(
  state: OrderState,
  actingUserId: string,
  action: DecisionAction,
  reason?: string,
): DecisionOutcome {
  if (state.status !== 'PENDING') {
    throw new ApprovalError(
      'ORDER_NOT_PENDING',
      'O pedido precisa estar PENDING para ser aprovado.',
    );
  }

  const current = state.chain[state.currentStep];

  if (current.userId !== actingUserId) {
    throw new ApprovalError(
      'NOT_CURRENT_APPROVER',
      'O pedido precisa ser aprovado pelo aprovador atual.',
    );
  }

  if (action === 'REJECT') {
    if (!reason?.trim()) {
      throw new ApprovalError(
        'REASON_REQUIRED',
        'Precisa fornecer uma razão para rejeição',
      );
    }
    return {
      stepPosition: current.position,
      stepDecision: 'REJECTED',
      newStatus: 'REJECTED',
      newCurrentStep: state.currentStep,
    };
  }

  const newCurrentStep = state.currentStep + 1;
  const concluida = newCurrentStep >= state.chain.length;
  return {
    stepPosition: current.position,
    stepDecision: 'APPROVED',
    newStatus: concluida ? 'APPROVED' : 'PENDING',
    newCurrentStep,
  };
}
