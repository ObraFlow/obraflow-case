import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ApprovalRuleInput,
  ApprovalRuleRange,
  ApprovalRulesRepository,
} from '../../domain/repositories/approval-rules.repository';
import { ApprovalRule } from '../../domain/entities/approval-rule.entity';
import { ApprovalRulesService } from './approval-rules.service';

const makeRepository = () => ({
  listByWork: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  workExists: jest.fn(),
  findUserIds: jest.fn(),
  listRangesByWork: jest.fn(),
});

const makeRule = (
  overrides: Partial<Parameters<typeof ApprovalRule.create>[0]> = {},
) =>
  ApprovalRule.create({
    id: 1,
    workId: 1,
    minimumTotalCents: 100,
    maximumTotalCents: 200,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  });

const makeInput = (
  overrides: Partial<ApprovalRuleInput> = {},
): ApprovalRuleInput => ({
  minimumTotalCents: 100,
  maximumTotalCents: 200,
  approvers: [{ userId: 1 }, { userId: 2 }],
  ...overrides,
});

const range = (
  id: number,
  min: number,
  max: number | null,
): ApprovalRuleRange => ({
  id,
  minimumTotalCents: min,
  maximumTotalCents: max,
});

describe('ApprovalRulesService', () => {
  let repository: ReturnType<typeof makeRepository>;
  let service: ApprovalRulesService;

  beforeEach(() => {
    repository = makeRepository();
    service = new ApprovalRulesService(
      repository as unknown as ApprovalRulesRepository,
    );
    repository.workExists.mockResolvedValue(true);
    repository.findUserIds.mockResolvedValue([1, 2]);
    repository.listRangesByWork.mockResolvedValue([]);
  });

  describe('list', () => {
    it('delega para repository.listByWork', async () => {
      const rules = [makeRule()];
      repository.listByWork.mockResolvedValue(rules);

      await expect(service.list(7)).resolves.toBe(rules);
      expect(repository.listByWork).toHaveBeenCalledWith(7);
    });
  });

  describe('create', () => {
    it('valida e cria a regra', async () => {
      const rule = makeRule();
      const input = makeInput();
      repository.create.mockResolvedValue(rule);

      await expect(service.create(1, input)).resolves.toBe(rule);
      expect(repository.workExists).toHaveBeenCalledWith(1);
      expect(repository.create).toHaveBeenCalledWith(1, input);
    });

    it('retorna null quando o repository retorna null', async () => {
      repository.create.mockResolvedValue(null);

      await expect(service.create(1, makeInput())).resolves.toBeNull();
    });

    it('não cria quando a validação falha', async () => {
      await expect(
        service.create(1, makeInput({ approvers: [] })),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('valida ignorando a própria regra e retorna a regra atualizada', async () => {
      const rule = makeRule();
      const input = makeInput();
      repository.update.mockResolvedValue(rule);

      await expect(service.update(1, 10, input)).resolves.toBe(rule);
      expect(repository.update).toHaveBeenCalledWith(1, 10, input);
    });

    it('lança NotFoundException quando a regra não existe', async () => {
      repository.update.mockResolvedValue(null);

      const promise = service.update(1, 10, makeInput());
      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow('Regra de alçada não encontrada.');
    });

    it('não atualiza quando a validação falha', async () => {
      await expect(
        service.update(1, 10, makeInput({ approvers: [] })),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('retorna true quando remove', async () => {
      repository.remove.mockResolvedValue(true);

      await expect(service.remove(1, 10)).resolves.toBe(true);
      expect(repository.remove).toHaveBeenCalledWith(1, 10);
    });

    it('lança NotFoundException quando não remove', async () => {
      repository.remove.mockResolvedValue(false);

      const promise = service.remove(1, 10);
      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow('Regra de alçada não encontrada.');
    });
  });

  describe('validate (via create)', () => {
    beforeEach(() => {
      repository.create.mockResolvedValue(makeRule());
    });

    it('rejeita regra sem aprovadores', async () => {
      const promise = service.create(1, makeInput({ approvers: [] }));
      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow(
        'A regra precisa de ao menos um aprovador.',
      );
    });

    it('rejeita máximo menor que o mínimo', async () => {
      const promise = service.create(
        1,
        makeInput({ minimumTotalCents: 200, maximumTotalCents: 100 }),
      );
      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow(
        'O limite máximo não pode ser menor que o mínimo.',
      );
    });

    it('aceita máximo igual ao mínimo', async () => {
      await expect(
        service.create(
          1,
          makeInput({ minimumTotalCents: 100, maximumTotalCents: 100 }),
        ),
      ).resolves.toBeDefined();
    });

    it('aceita regra sem máximo', async () => {
      await expect(
        service.create(1, makeInput({ maximumTotalCents: undefined })),
      ).resolves.toBeDefined();
    });

    it('lança NotFoundException quando a obra não existe', async () => {
      repository.workExists.mockResolvedValue(false);

      const promise = service.create(1, makeInput());
      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow('Obra não encontrada.');
      expect(repository.findUserIds).not.toHaveBeenCalled();
    });

    it('rejeita aprovador duplicado', async () => {
      const promise = service.create(
        1,
        makeInput({ approvers: [{ userId: 1 }, { userId: 1 }] }),
      );
      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow(
        'Um aprovador não pode aparecer duas vezes na mesma regra.',
      );
      expect(repository.findUserIds).not.toHaveBeenCalled();
    });

    it('rejeita quando algum aprovador não existe', async () => {
      repository.findUserIds.mockResolvedValue([1]);

      const promise = service.create(1, makeInput());
      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow(
        'Um ou mais aprovadores não existem.',
      );
      expect(repository.findUserIds).toHaveBeenCalledWith([1, 2]);
    });

    describe('conflito de faixas', () => {
      const conflictMessage = 'Já existe uma regra para esta faixa da obra.';

      const expectConflict = async (
        existing: ReturnType<typeof range>[],
        input: ApprovalRuleInput,
      ) => {
        repository.listRangesByWork.mockResolvedValue(existing);
        const promise = service.create(1, input);
        await expect(promise).rejects.toThrow(BadRequestException);
        await expect(promise).rejects.toThrow(conflictMessage);
      };

      const expectNoConflict = async (
        existing: ReturnType<typeof range>[],
        input: ApprovalRuleInput,
      ) => {
        repository.listRangesByWork.mockResolvedValue(existing);
        await expect(service.create(1, input)).resolves.toBeDefined();
      };

      it('não conflita sem regras existentes', async () => {
        await expectNoConflict([], makeInput());
      });

      it('conflita com faixa idêntica', async () => {
        await expectConflict([range(10, 100, 200)], makeInput());
      });

      it('conflita com faixa contida', async () => {
        await expectConflict(
          [range(10, 100, 200)],
          makeInput({ minimumTotalCents: 120, maximumTotalCents: 150 }),
        );
      });

      it('conflita quando a nova começa exatamente no máximo existente (limite inclusivo)', async () => {
        await expectConflict(
          [range(10, 100, 200)],
          makeInput({ minimumTotalCents: 200, maximumTotalCents: 300 }),
        );
      });

      it('conflita quando a nova termina exatamente no mínimo existente (limite inclusivo)', async () => {
        await expectConflict(
          [range(10, 100, 200)],
          makeInput({ minimumTotalCents: 50, maximumTotalCents: 100 }),
        );
      });

      it('não conflita com faixa totalmente acima da existente', async () => {
        await expectNoConflict(
          [range(10, 100, 200)],
          makeInput({ minimumTotalCents: 201, maximumTotalCents: 300 }),
        );
      });

      it('não conflita com faixa totalmente abaixo da existente', async () => {
        await expectNoConflict(
          [range(10, 100, 200)],
          makeInput({ minimumTotalCents: 0, maximumTotalCents: 99 }),
        );
      });

      it('nova sem máximo conflita com faixa existente acima do seu mínimo', async () => {
        await expectConflict(
          [range(10, 100, 200)],
          makeInput({ minimumTotalCents: 150, maximumTotalCents: undefined }),
        );
      });

      it('nova sem máximo não conflita com faixa existente abaixo do seu mínimo', async () => {
        await expectNoConflict(
          [range(10, 100, 200)],
          makeInput({ minimumTotalCents: 250, maximumTotalCents: undefined }),
        );
      });

      it('existente sem máximo conflita com nova acima do mínimo existente', async () => {
        await expectConflict(
          [range(10, 100, null)],
          makeInput({ minimumTotalCents: 5000, maximumTotalCents: 6000 }),
        );
      });

      it('existente sem máximo não conflita com nova abaixo do mínimo existente', async () => {
        await expectNoConflict(
          [range(10, 100, null)],
          makeInput({ minimumTotalCents: 10, maximumTotalCents: 50 }),
        );
      });

      it('duas faixas sem máximo sempre conflitam', async () => {
        await expectConflict(
          [range(10, 100, null)],
          makeInput({ minimumTotalCents: 5000, maximumTotalCents: undefined }),
        );
      });

      it('confere todas as regras existentes, não só a primeira', async () => {
        await expectConflict(
          [range(10, 0, 50), range(11, 100, 200)],
          makeInput({ minimumTotalCents: 150, maximumTotalCents: 160 }),
        );
      });
    });

    describe('conflito de faixas em update', () => {
      beforeEach(() => {
        repository.update.mockResolvedValue(makeRule());
      });

      it('ignora a própria regra ao checar conflito', async () => {
        repository.listRangesByWork.mockResolvedValue([range(10, 100, 200)]);

        await expect(service.update(1, 10, makeInput())).resolves.toBeDefined();
      });

      it('ainda conflita com outra regra diferente da ignorada', async () => {
        repository.listRangesByWork.mockResolvedValue([
          range(10, 100, 200),
          range(11, 150, 300),
        ]);

        await expect(service.update(1, 10, makeInput())).rejects.toThrow(
          'Já existe uma regra para esta faixa da obra.',
        );
      });
    });
  });
});
