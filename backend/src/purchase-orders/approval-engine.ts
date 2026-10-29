export interface RuleRange {
    id: string;
    minValue: number;
    maxValue: number | null;     // null = faixa aberta para cima (+infinito)
    approverUserIds: string[];   // aprovadores na ordem do fluxo
}

export interface ChainStep {
    position: number;
    userId: string;
    decision: 'PENDING';
}

// o service vai traduzir isso num HTTP 422.
export class NoMatchingRangeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NoMatchingRangeError';
    }
}

// Acha a faixa que cobre `total`, ou null se nenhuma cobrir.
export function selectRange(ranges: RuleRange[], total: number): RuleRange | null {

    let filteredRanges = ranges.filter(range => range.minValue <= total && (range.maxValue === null || range.maxValue >= total))

    if (filteredRanges.length > 1) {
        return filteredRanges.sort((a, b) => (a.maxValue ?? Infinity) - (b.maxValue ?? Infinity))[0];
    }
    return filteredRanges[0] ?? null;
}

export function resolveChain(ranges: RuleRange[], total: number): ChainStep[] {
    const range = selectRange(ranges, total);
    if (!range) {
        throw new NoMatchingRangeError(
            'Nenhuma faixa de alçada cobre o valor total deste pedido nesta obra.',
        );
    }
    // Transforma os aprovadores da faixa na cadeia inicial, preservando a ordem.
    // A anotação `: ChainStep` faz o TS tratar 'PENDING' como o literal (não string).
    return range.approverUserIds.map((userId, index): ChainStep => ({
        position: index,
        userId,
        decision: 'PENDING',
    }));
}