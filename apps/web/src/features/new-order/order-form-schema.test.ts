import { describe, expect, it } from 'vitest';
import {
  emptyItem,
  type OrderFormValues,
  orderTotalOf,
  pendingIssues as pendingIssueList,
  toCreateInput,
} from './order-form-schema';

const pendingIssues = (values: OrderFormValues) =>
  pendingIssueList(values).map((issue) => issue.message);

const valid: OrderFormValues = {
  projectId: '1',
  supplierId: '1',
  orderDate: '2026-10-23',
  notes: '',
  items: [
    {
      description: 'Cimento CP-II 50kg',
      quantity: '100',
      unit: 'sc',
      unitPrice: '32,00',
    },
    {
      description: 'Areia média',
      quantity: '12,5',
      unit: 'm3',
      unitPrice: '145',
    },
  ],
};

describe('pendingIssues', () => {
  it('pedido válido não tem pendências', () => {
    expect(pendingIssues(valid)).toEqual([]);
  });

  it('formulário em branco lista uma pendência por campo, com o número do item', () => {
    const issues = pendingIssues({
      projectId: '',
      supplierId: '',
      orderDate: '2026-10-23',
      notes: '',
      items: [emptyItem()],
    });
    expect(issues).toEqual([
      'Selecione a obra.',
      'Selecione o fornecedor.',
      'Item 1: informe a descrição do item.',
      'Item 1: informe a quantidade.',
      'Item 1: informe o preço unitário.',
    ]);
  });

  it('quantidade negativa e preço não numérico geram erro no item certo', () => {
    const issues = pendingIssues({
      ...valid,
      items: [
        valid.items[0],
        { ...valid.items[1], quantity: '-5' },
        {
          description: 'Vergalhão',
          quantity: '300',
          unit: 'm',
          unitPrice: 'abc',
        },
      ],
    });
    expect(issues).toEqual([
      'Item 2: a quantidade deve ser maior que zero (até 3 casas decimais).',
      'Item 3: preço inválido: use um valor maior ou igual a zero, com até 2 casas decimais.',
    ]);
  });

  it('pedido sem itens não é válido', () => {
    expect(pendingIssues({ ...valid, items: [] })).toEqual([
      'O pedido precisa ter pelo menos 1 item.',
    ]);
  });
});

describe('orderTotalOf', () => {
  it('soma os itens aceitando o formato brasileiro', () => {
    expect(orderTotalOf(valid.items)).toBe('5012.50'); // 3200,00 + 1812,50
  });

  it('fica indefinido enquanto algum item não tem quantidade e preço válidos', () => {
    expect(orderTotalOf([...valid.items, emptyItem()])).toBeNull();
  });
});

describe('toCreateInput', () => {
  it('converte para o formato da API, sem observação vazia', () => {
    expect(toCreateInput(valid, 4)).toEqual({
      projectId: 1,
      supplierId: 1,
      requesterId: 4,
      orderDate: '2026-10-23',
      notes: undefined,
      items: [
        {
          description: 'Cimento CP-II 50kg',
          quantity: '100',
          unit: 'sc',
          unitPrice: '32',
        },
        {
          description: 'Areia média',
          quantity: '12.5',
          unit: 'm3',
          unitPrice: '145',
        },
      ],
    });
  });
});
