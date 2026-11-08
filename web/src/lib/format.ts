const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const num = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 })

export const formatBRL = (cents: number) => brl.format(cents / 100)

// "2.5" (formato da API) -> "2,5"
export const formatQuantity = (q: string) => num.format(Number(q))

export function formatDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Aceita o jeito brasileiro de digitar dinheiro: "1.234,56", "1234,56", "1234".
// Também aceita "1234.56" (ponto com 1 ou 2 casas no fim = decimal).
// Retorna centavos inteiros ou null se não der para entender.
export function parseMoney(input: string): number | null {
  let s = input
    .trim()
    .replace(/^R\$\s*/i, '')
    .replace(/\s/g, '')
  if (!s) return null
  if (s.includes(',')) {
    if (!/^\d{1,3}(\.\d{3})*(,\d{0,2})?$|^\d+(,\d{0,2})?$/.test(s)) return null
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (/^\d+\.\d{1,2}$/.test(s)) {
    // "12.5" ou "12.50": decimal
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '') // "10.000": milhar
  } else if (!/^\d+$/.test(s)) {
    return null
  }
  const [int, frac = ''] = s.split('.')
  return Number(int) * 100 + Number(frac.padEnd(2, '0'))
}

// Quantidade aceita vírgula ou ponto como decimal, até 3 casas.
// Devolve no formato da API ("2.5") ou null.
export function parseQuantity(input: string): string | null {
  const s = input.trim().replace(',', '.')
  if (!/^\d{1,7}(\.\d{1,3})?$/.test(s)) return null
  if (Number(s) <= 0) return null
  return s
}

// mesmo cálculo do backend (milésimos × centavos, arredonda ao centavo)
export function lineTotal(quantity: string, unitPriceCents: number) {
  const [int, frac = ''] = quantity.split('.')
  const milli = Number(int) * 1000 + Number(frac.padEnd(3, '0'))
  return Number((BigInt(milli) * BigInt(unitPriceCents) + 500n) / 1000n)
}

// "R$ 10.000,01 – R$ 100.000,00", "Até R$ 10.000,00", "Acima de R$ 100.000,00"
export function tierRange(t: { fromCents: number; upToCents: number | null }) {
  if (t.upToCents === null) return t.fromCents === 0 ? 'Qualquer valor' : `Acima de ${formatBRL(t.fromCents - 1)}`
  if (t.fromCents === 0) return `Até ${formatBRL(t.upToCents)}`
  return `${formatBRL(t.fromCents)} a ${formatBRL(t.upToCents)}`
}

// "1234,5" a partir de centavos, para preencher input em edição
const plain = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const centsToInput = (cents: number) => plain.format(cents / 100)

// "hoje", "há 1 dia", "há 6 dias"
export function since(iso: string, now = Date.now()) {
  const days = Math.floor((now - Date.parse(iso)) / 86_400_000)
  if (days <= 0) {
    const hours = Math.floor((now - Date.parse(iso)) / 3_600_000)
    return hours < 1 ? 'agora há pouco' : `há ${hours} h`
  }
  return days === 1 ? 'há 1 dia' : `há ${days} dias`
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
