import { describe, expect, it } from 'vitest';
import { computeLineTotal, computeOrderTotal } from './money.js';

describe('money', () => {
    it('calcula o total da linha arredondado a 2 casas', () => {
        expect(computeLineTotal(1.5, 2.33)).toBe(3.5);   // 3,495 -> 3,50
    });

    it('soma os itens do pedido', () => {
        const total = computeOrderTotal([
            { quantity: 2.5, unitPrice: 10.1 },  // 25,25
            { quantity: 3, unitPrice: 2 },        // 6,00
        ]);
        expect(total).toBe(31.25);
    });
});