// Quantidade trafega na API como string decimal ("2.5") e é guardada em
// milésimos (2500). Assim nenhuma conta passa por float.

const QUANTITY_RE = /^\d{1,7}(\.\d{1,3})?$/

export function parseQuantity(value: string): number | null {
  if (!QUANTITY_RE.test(value)) return null
  const [int, frac = ''] = value.split('.')
  return Number(int) * 1000 + Number(frac.padEnd(3, '0'))
}

export function formatQuantity(milli: number): string {
  const int = Math.trunc(milli / 1000)
  const frac = String(milli % 1000)
    .padStart(3, '0')
    .replace(/0+$/, '')
  return frac ? `${int}.${frac}` : String(int)
}

// quantidade × preço, arredondado ao centavo (meio para cima).
// BigInt só na multiplicação, que pode passar de 2^53 antes da divisão.
export function lineTotalCents(quantityMilli: number, unitPriceCents: number): number {
  return Number((BigInt(quantityMilli) * BigInt(unitPriceCents) + 500n) / 1000n)
}
