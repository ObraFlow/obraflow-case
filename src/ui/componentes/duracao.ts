/**
 * Duração em palavra de gente, como o artboard `Dashboard` a escreve.
 *
 * Duas escalas, e a escolha é pela ordem de grandeza: abaixo de um dia o que interessa são horas
 * e minutos ("9h40min"); acima, dias e horas ("3 d 6 h"). Um pedido parado há 78 horas dito assim
 * não comunica — "3 d 6 h" comunica.
 *
 * Fica em `src/ui/`, e não no domínio, porque é formatação: o domínio devolve milissegundos, que
 * é o número com que se faz conta.
 */

const MINUTO = 60_000
const HORA = 60 * MINUTO
const DIA = 24 * HORA

/** "9h40min", "3 d 6 h", "48min". `null` vira o travessão que a tela usa para "não há". */
export function duracao(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < HORA) return `${Math.round(ms / MINUTO)}min`

  if (ms < DIA) {
    const horas = Math.floor(ms / HORA)
    const minutos = Math.round((ms % HORA) / MINUTO)
    return minutos === 0 ? `${horas}h` : `${horas}h${String(minutos).padStart(2, '0')}min`
  }

  const dias = Math.floor(ms / DIA)
  const horas = Math.round((ms % DIA) / HORA)
  return horas === 0 ? `${dias} d` : `${dias} d ${horas} h`
}

/** A mesma duração em forma compacta, para a coluna estreita: "4h10", "3d6h". */
export function duracaoCurta(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < HORA) return `${Math.round(ms / MINUTO)}min`
  if (ms < DIA) {
    const horas = Math.floor(ms / HORA)
    const minutos = Math.round((ms % HORA) / MINUTO)
    return `${horas}h${String(minutos).padStart(2, '0')}`
  }
  const dias = Math.floor(ms / DIA)
  const horas = Math.round((ms % DIA) / HORA)
  return `${dias}d${horas}h`
}

/** "+23,5%" / "−12,4%". `null` — período anterior em zero — não vira seta nem número. */
export function variacao(fracao: number | null): string | null {
  if (fracao === null) return null
  const sinal = fracao >= 0 ? '+' : '−'
  const absoluto = Math.abs(fracao) * 100
  return `${sinal}${absoluto.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

/** O valor em milhares de reais, como o eixo do gráfico de linhas o escreve. */
export function milReais(centavos: number): string {
  return (centavos / 100_000).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}
