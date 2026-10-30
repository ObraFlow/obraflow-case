import { describe, expect, it } from 'vitest';
import { itemTotal, orderTotal, parseDecimalInput } from './money';

// Os mesmos casos de apps/api/src/common/domain/money.spec.ts: a prévia do formulário
// precisa bater centavo a centavo com o total que a API calcula.
describe('itemTotal / orderTotal (paridade com o backend)', () => {
  it('multiplica e arredonda para centavos (meio para cima)', () => {
    expect(itemTotal('100', '32.00')).toBe('3200.00');
    expect(itemTotal('12.5', '145.00')).toBe('1812.50');
    expect(itemTotal('0.333', '10.00')).toBe('3.33');
    expect(itemTotal('0.005', '1.00')).toBe('0.01');
  });

  it('soma sem erro de ponto flutuante', () => {
    expect(orderTotal([itemTotal('1', '0.10'), itemTotal('1', '0.20')])).toBe(
      '0.30',
    );
    expect(orderTotal(['3200.00', '1740.00', '7560.00'])).toBe('12500.00');
    expect(orderTotal([])).toBe('0.00');
  });
});

describe('parseDecimalInput', () => {
  it('aceita o formato brasileiro e devolve o formato da API', () => {
    expect(parseDecimalInput('1.234,56', 2)).toBe('1234.56');
    expect(parseDecimalInput('32', 2)).toBe('32');
    expect(parseDecimalInput(' 12,5 ', 3)).toBe('12.5');
  });

  it('recusa valores inválidos ou com casas demais', () => {
    expect(parseDecimalInput('abc', 2)).toBeNull();
    expect(parseDecimalInput('-5', 2)).toBeNull();
    expect(parseDecimalInput('1,234', 2)).toBeNull();
    expect(parseDecimalInput('', 2)).toBeNull();
  });
});
