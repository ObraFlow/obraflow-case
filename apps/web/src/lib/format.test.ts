import { describe, expect, it } from 'vitest';
import { formatBRL, formatDate, formatRange } from './format';

const nbsp = (text: string) => text.replace(/ /g, ' ');

describe('format', () => {
  it('formata dinheiro em reais', () => {
    expect(nbsp(formatBRL('12500.00'))).toBe('R$ 12.500,00');
  });

  it('formata data sem sofrer com fuso horário', () => {
    expect(formatDate('2026-10-01')).toBe('01/10/2026');
  });

  it('descreve as faixas como na tela de alçadas', () => {
    expect(nbsp(formatRange('0.00', '10000.00'))).toBe('Até R$ 10.000,00');
    expect(nbsp(formatRange('10000.01', '50000.00'))).toBe(
      'De R$ 10.000,01 até R$ 50.000,00',
    );
    expect(nbsp(formatRange('50000.01', null))).toBe('Acima de R$ 50.000,00');
    expect(formatRange('0.00', null)).toBe('Qualquer valor');
  });
});
