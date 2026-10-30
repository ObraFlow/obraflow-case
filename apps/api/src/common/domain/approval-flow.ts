import { OrderStatus, StepStatus } from '../../../prisma/generated/enums.js';

// Máquina de estados do fluxo de aprovação de um pedido.
// Funções puras: recebem o estado atual e devolvem o próximo, sem tocar no banco.
// O service persiste o resultado; o seed usa as mesmas funções para gerar pedidos coerentes.

export interface FlowState {
  status: OrderStatus;
  /** Posição (1-based) da etapa aguardando decisão; null quando o fluxo terminou. */
  currentStep: number | null;
  /** Status de cada etapa, na ordem: steps[0] é a etapa 1. */
  steps: StepStatus[];
}

export class FlowFinishedError extends Error {
  constructor(public readonly status: OrderStatus) {
    super(`O fluxo de aprovação já terminou (pedido ${status}).`);
  }
}

/** Fluxo recém-criado: a 1ª etapa aguarda decisão, as demais esperam a vez. */
export function startFlow(stepCount: number): FlowState {
  if (stepCount < 1)
    throw new Error('A cadeia de aprovação precisa ter ao menos 1 etapa.');
  return {
    status: OrderStatus.PENDING,
    currentStep: 1,
    steps: Array.from({ length: stepCount }, (_, index) =>
      index === 0 ? StepStatus.PENDING : StepStatus.WAITING,
    ),
  };
}

/** Aprova a etapa atual: avança para a próxima ou, se era a última, aprova o pedido. */
export function approveCurrentStep(state: FlowState): FlowState {
  const current = assertPending(state);
  const steps = [...state.steps];
  steps[current - 1] = StepStatus.APPROVED;

  const isLast = current === steps.length;
  if (isLast) {
    return { status: OrderStatus.APPROVED, currentStep: null, steps };
  }
  steps[current] = StepStatus.PENDING;
  return { status: OrderStatus.PENDING, currentStep: current + 1, steps };
}

/** Rejeita a etapa atual: encerra o fluxo; etapas seguintes não chegam a acontecer. */
export function rejectCurrentStep(state: FlowState): FlowState {
  const current = assertPending(state);
  const steps = state.steps.map((status, index) => {
    if (index === current - 1) return StepStatus.REJECTED;
    if (index >= current) return StepStatus.SKIPPED;
    return status;
  });
  return { status: OrderStatus.REJECTED, currentStep: null, steps };
}

function assertPending(state: FlowState): number {
  if (state.status !== OrderStatus.PENDING || state.currentStep === null) {
    throw new FlowFinishedError(state.status);
  }
  return state.currentStep;
}
