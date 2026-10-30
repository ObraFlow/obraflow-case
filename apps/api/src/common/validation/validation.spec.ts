import type { ValidationError } from '@nestjs/common';
import { flattenValidationErrors } from './validation.js';

describe('flattenValidationErrors', () => {
  it('gera o caminho completo dos campos, inclusive dentro de listas', () => {
    const errors: ValidationError[] = [
      {
        property: 'supplierId',
        constraints: { isInt: 'Selecione um fornecedor.' },
        children: [],
      },
      {
        property: 'items',
        children: [
          {
            property: '1',
            children: [
              {
                property: 'quantity',
                constraints: {
                  isPositive: 'A quantidade deve ser maior que zero.',
                  isDecimal: 'Quantidade inválida.',
                },
                children: [],
              },
            ],
          },
        ],
      },
    ];

    expect(flattenValidationErrors(errors)).toEqual([
      { field: 'supplierId', message: 'Selecione um fornecedor.' },
      {
        field: 'items.1.quantity',
        message: 'A quantidade deve ser maior que zero.',
      },
    ]);
  });
});
