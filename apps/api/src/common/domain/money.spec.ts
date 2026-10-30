import { Decimal, formatBRL, itemTotal, orderTotal } from './money.js';

const d = (value: string) => new Decimal(value);

describe('itemTotal', () => {
  it('multiplica quantidade por preço unitário', () => {
    expect(itemTotal(d('100'), d('32.00')).toFixed(2)).toBe('3200.00');
  });

  it('aceita quantidade fracionária e arredonda para centavos (meio para cima)', () => {
    expect(itemTotal(d('12.5'), d('145.00')).toFixed(2)).toBe('1812.50');
    expect(itemTotal(d('0.333'), d('10.00')).toFixed(2)).toBe('3.33');
    expect(itemTotal(d('0.005'), d('1.00')).toFixed(2)).toBe('0.01');
  });

  it('não sofre com erro de ponto flutuante (0,1 + 0,2)', () => {
    const total = orderTotal([
      itemTotal(d('1'), d('0.10')),
      itemTotal(d('1'), d('0.20')),
    ]);
    expect(total.toFixed(2)).toBe('0.30');
  });
});

describe('orderTotal', () => {
  it('soma os totais dos itens', () => {
    const total = orderTotal([d('3200.00'), d('1740.00'), d('7560.00')]);
    expect(total.toFixed(2)).toBe('12500.00');
  });

  it('pedido sem itens soma zero', () => {
    expect(orderTotal([]).toFixed(2)).toBe('0.00');
  });
});

describe('formatBRL', () => {
  it('formata no padrão brasileiro', () => {
    expect(formatBRL(d('12500'))).toBe('R$ 12.500,00');
    expect(formatBRL(d('1234567.8'))).toBe('R$ 1.234.567,80');
    expect(formatBRL(d('0.5'))).toBe('R$ 0,50');
  });
});
