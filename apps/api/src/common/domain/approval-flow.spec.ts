import {
  approveCurrentStep,
  FlowFinishedError,
  rejectCurrentStep,
  startFlow,
} from './approval-flow.js';

describe('startFlow', () => {
  it('a 1ª etapa aguarda decisão e as demais esperam a vez', () => {
    expect(startFlow(3)).toEqual({
      status: 'PENDING',
      currentStep: 1,
      steps: ['PENDING', 'WAITING', 'WAITING'],
    });
  });

  it('exige ao menos 1 etapa', () => {
    expect(() => startFlow(0)).toThrow();
  });
});

describe('approveCurrentStep', () => {
  it('aprovar avança para a próxima etapa', () => {
    expect(approveCurrentStep(startFlow(3))).toEqual({
      status: 'PENDING',
      currentStep: 2,
      steps: ['APPROVED', 'PENDING', 'WAITING'],
    });
  });

  it('aprovar a última etapa aprova o pedido e encerra o fluxo', () => {
    const state = approveCurrentStep(approveCurrentStep(startFlow(2)));
    expect(state).toEqual({
      status: 'APPROVED',
      currentStep: null,
      steps: ['APPROVED', 'APPROVED'],
    });
  });

  it('cadeia de 1 etapa: uma aprovação conclui o pedido', () => {
    expect(approveCurrentStep(startFlow(1)).status).toBe('APPROVED');
  });

  it('não é possível decidir um fluxo já encerrado', () => {
    const approved = approveCurrentStep(startFlow(1));
    expect(() => approveCurrentStep(approved)).toThrow(FlowFinishedError);
    expect(() => rejectCurrentStep(approved)).toThrow(FlowFinishedError);
  });
});

describe('rejectCurrentStep', () => {
  it('rejeitar encerra o fluxo e marca as etapas seguintes como SKIPPED', () => {
    const state = rejectCurrentStep(approveCurrentStep(startFlow(4)));
    expect(state).toEqual({
      status: 'REJECTED',
      currentStep: null,
      steps: ['APPROVED', 'REJECTED', 'SKIPPED', 'SKIPPED'],
    });
  });

  it('rejeitar na 1ª etapa: nenhuma outra etapa acontece', () => {
    expect(rejectCurrentStep(startFlow(3)).steps).toEqual([
      'REJECTED',
      'SKIPPED',
      'SKIPPED',
    ]);
  });

  it('pedido rejeitado não pode ser retomado', () => {
    const rejected = rejectCurrentStep(startFlow(2));
    expect(() => approveCurrentStep(rejected)).toThrow(FlowFinishedError);
  });
});
