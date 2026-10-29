import { Prisma } from '../generated/prisma/client.js';
import { formatMoney } from './money-format.interceptor.js';
import { flattenValidationErrors } from './validation.js';
import { isValidCnpj, maxOrderDate } from './validators.js';

describe('isValidCnpj', () => {
  it('checks both check digits', () => {
    expect(isValidCnpj('11222333000181')).toBe(true);
    expect(isValidCnpj('11222333000182')).toBe(false);
    expect(isValidCnpj('11222333000191')).toBe(false);
  });

  it('refuses repeated digits and wrong lengths', () => {
    expect(isValidCnpj('00000000000000')).toBe(false);
    expect(isValidCnpj('1122233300018')).toBe(false);
  });
});

describe('maxOrderDate', () => {
  it('is one year and one day after today (UTC)', () => {
    expect(maxOrderDate(new Date('2026-10-29T12:00:00Z'))).toBe('2027-10-30');
  });
});

describe('formatMoney', () => {
  it('writes money fields with two decimals and leaves the rest alone', () => {
    const createdAt = new Date('2026-10-29T00:00:00Z');
    expect(
      formatMoney({
        total: new Prisma.Decimal('10000'),
        items: [
          {
            quantity: new Prisma.Decimal('12.5'),
            unitPrice: new Prisma.Decimal('0.1'),
          },
        ],
        tier: { maxAmount: null, minAmount: new Prisma.Decimal('5000') },
        metadata: { total: '10000' },
        createdAt,
      }),
    ).toEqual({
      total: '10000.00',
      items: [{ quantity: new Prisma.Decimal('12.5'), unitPrice: '0.10' }],
      tier: { maxAmount: null, minAmount: '5000.00' },
      metadata: { total: '10000' },
      createdAt,
    });
  });
});

describe('flattenValidationErrors', () => {
  it('translates built-in messages and keeps the field path', () => {
    expect(
      flattenValidationErrors([
        {
          property: 'items',
          children: [
            {
              property: '0',
              children: [
                {
                  property: 'description',
                  constraints: {
                    isNotEmpty: 'description should not be empty',
                    maxLength:
                      'description must be shorter than or equal to 200 characters',
                  },
                },
              ],
            },
          ],
        },
        {
          property: 'total',
          constraints: {
            whitelistValidation: 'property total should not exist',
          },
        },
      ]),
    ).toEqual([
      'items.0.description: é obrigatório',
      'items.0.description: deve ter no máximo 200 caracteres',
      'total: campo não permitido',
    ]);
  });

  it('keeps messages written by hand in the DTOs', () => {
    expect(
      flattenValidationErrors([
        {
          property: 'reason',
          constraints: { isNotEmpty: 'informe o motivo da rejeição' },
        },
      ]),
    ).toEqual(['reason: informe o motivo da rejeição']);
  });
});
