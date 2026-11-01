export function resolveRule<R extends { upTo: number | null }>(rules: R[], totalCents: number): R | undefined {
  return [...rules]
    .sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity))
    .find((r) => r.upTo === null || totalCents <= r.upTo);
}
