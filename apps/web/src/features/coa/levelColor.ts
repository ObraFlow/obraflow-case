/** Positions, not people or workflow status. Five or more levels repeat the cycle. */
export function levelColor(index: number): string {
  return `var(--coa-level-${(index % 4) + 1})`;
}
