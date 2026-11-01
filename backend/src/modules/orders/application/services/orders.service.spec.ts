import { BadRequestException } from '@nestjs/common';
import { OrdersRepository } from '../../domain/repositories/orders.repository';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
} from '../../domain/entities/purchase-order.entity';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { OrdersService } from './orders.service';

const makeRepository = () => ({
  list: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  decide: jest.fn(),
});

const makeOrder = (status: PurchaseOrderStatus = 'PENDING') =>
  PurchaseOrder.create({
    id: 1,
    workId: 2,
    supplierId: 3,
    orderDate: new Date('2026-01-01'),
    notes: null,
    totalCents: 1000,
    status,
    createdAt: new Date('2026-01-01'),
  });

const makeItem = (overrides: Record<string, unknown> = {}) => ({
  description: 'Cimento',
  unit: 'saco',
  quantity: 2,
  unitPriceCents: 1500,
  ...overrides,
});

const makeInput = (overrides: Record<string, unknown> = {}) =>
  ({
    workId: 2,
    supplierId: 3,
    orderDate: '2026-01-01',
    notes: 'obs',
    items: [makeItem()],
    ...overrides,
  }) as unknown as CreateOrderDto;

describe('OrdersService', () => {
  let repository: ReturnType<typeof makeRepository>;
  let service: OrdersService;

  beforeEach(() => {
    repository = makeRepository();
    service = new OrdersService(repository as unknown as OrdersRepository);
  });

  describe('list', () => {
    it('delega para repository.list', async () => {
      const orders = [{ id: 1 }];
      repository.list.mockResolvedValue(orders);

      await expect(service.list()).resolves.toBe(orders);
      expect(repository.list).toHaveBeenCalledTimes(1);
    });
  });

  describe('get', () => {
    it('delega para repository.getById e retorna o pedido', async () => {
      const order = makeOrder();
      repository.getById.mockResolvedValue(order);

      await expect(service.get(1)).resolves.toBe(order);
      expect(repository.getById).toHaveBeenCalledWith(1);
    });

    it('retorna null quando o pedido não existe', async () => {
      repository.getById.mockResolvedValue(null);

      await expect(service.get(99)).resolves.toBeNull();
    });
  });

  describe('create', () => {
    const expectBadRequest = async (input: CreateOrderDto, message: string) => {
      const promise = service.create(input);
      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow(message);
      expect(repository.create).not.toHaveBeenCalled();
    };

    it('calcula os totais e envia os dados ao repository', async () => {
      const order = makeOrder();
      repository.create.mockResolvedValue(order);

      await expect(service.create(makeInput())).resolves.toBe(order);
      expect(repository.create).toHaveBeenCalledWith({
        workId: 2,
        supplierId: 3,
        orderDate: '2026-01-01',
        notes: 'obs',
        totalCents: 3000,
        items: [
          {
            description: 'Cimento',
            unit: 'saco',
            quantity: '2.000',
            unitPriceCents: 1500,
            totalCents: 3000,
          },
        ],
      });
    });

    it('soma o total de vários itens e arredonda o total de cada item', async () => {
      repository.create.mockResolvedValue(makeOrder());

      await service.create(
        makeInput({
          items: [
            makeItem(),
            makeItem({
              description: 'Areia',
              quantity: '1.5',
              unitPriceCents: 333,
            }),
          ],
        }),
      );

      const data = repository.create.mock.calls[0][0];
      expect(data.items[1]).toEqual({
        description: 'Areia',
        unit: 'saco',
        quantity: '1.500',
        unitPriceCents: 333,
        totalCents: 500,
      });
      expect(data.totalCents).toBe(3500);
    });

    it('aceita preço unitário zero', async () => {
      repository.create.mockResolvedValue(makeOrder());

      await service.create(
        makeInput({ items: [makeItem({ unitPriceCents: 0 })] }),
      );

      const data = repository.create.mock.calls[0][0];
      expect(data.items[0].totalCents).toBe(0);
      expect(data.totalCents).toBe(0);
    });

    it('retorna null quando o repository retorna null', async () => {
      repository.create.mockResolvedValue(null);

      await expect(service.create(makeInput())).resolves.toBeNull();
    });

    it('rejeita pedido sem items (undefined)', async () => {
      await expectBadRequest(
        makeInput({ items: undefined }),
        'O pedido precisa ter ao menos um item.',
      );
    });

    it('rejeita pedido com lista de items vazia', async () => {
      await expectBadRequest(
        makeInput({ items: [] }),
        'O pedido precisa ter ao menos um item.',
      );
    });

    it.each([0, -1, 'abc', Infinity, NaN])(
      'rejeita quantidade inválida (%p)',
      async (quantity) => {
        await expectBadRequest(
          makeInput({ items: [makeItem({ quantity })] }),
          'Quantidade inválida no item "Cimento".',
        );
      },
    );

    it.each([10.5, -1])(
      'rejeita preço inválido (%p)',
      async (unitPriceCents) => {
        await expectBadRequest(
          makeInput({ items: [makeItem({ unitPriceCents })] }),
          'Preço inválido no item "Cimento".',
        );
      },
    );

    it('rejeita o pedido inteiro quando só o segundo item é inválido', async () => {
      await expectBadRequest(
        makeInput({
          items: [makeItem(), makeItem({ description: 'Areia', quantity: 0 })],
        }),
        'Quantidade inválida no item "Areia".',
      );
    });
  });

  describe('decide', () => {
    it('aprova sem exigir motivo', async () => {
      const order = makeOrder('APPROVED');
      repository.decide.mockResolvedValue(order);

      await expect(service.decide(1, 7, true)).resolves.toBe(order);
      expect(repository.decide).toHaveBeenCalledWith(1, 7, true, undefined);
    });

    it('aprova repassando o motivo quando informado', async () => {
      repository.decide.mockResolvedValue(makeOrder('APPROVED'));

      await service.decide(1, 7, true, 'ok');

      expect(repository.decide).toHaveBeenCalledWith(1, 7, true, 'ok');
    });

    it('rejeita com motivo válido', async () => {
      const order = makeOrder('REJECTED');
      repository.decide.mockResolvedValue(order);

      await expect(service.decide(1, 7, false, 'preço alto')).resolves.toBe(
        order,
      );
      expect(repository.decide).toHaveBeenCalledWith(1, 7, false, 'preço alto');
    });

    it('retorna null quando o repository retorna null', async () => {
      repository.decide.mockResolvedValue(null);

      await expect(service.decide(1, 7, true)).resolves.toBeNull();
    });

    it.each([undefined, '', '   '])(
      'lança BadRequestException (síncrona) ao rejeitar sem motivo (%p)',
      (reason) => {
        expect(() => service.decide(1, 7, false, reason)).toThrow(
          BadRequestException,
        );
        expect(() => service.decide(1, 7, false, reason)).toThrow(
          'O motivo da rejeição é obrigatório.',
        );
        expect(repository.decide).not.toHaveBeenCalled();
      },
    );
  });
});
