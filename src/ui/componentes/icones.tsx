/**
 * Os ícones dos artboards, traçados com os mesmos atributos do mockup: `fill none`,
 * `stroke currentColor` e a espessura que cada um usa. Decorativos levam `aria-hidden`.
 */

type Props = { tamanho?: number; className?: string }

export function IconeChevronBaixo({ tamanho = 16, className }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" className={className}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function IconeChevronDireita({ tamanho = 16, className }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" className={className}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

export function IconeFechar({ tamanho = 18, className }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function IconeBusca({ tamanho = 16, className }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </svg>
  )
}

export function IconeConfirmado({ tamanho = 17, className }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className={className}>
      <path d="M4 12l5 5L20 6" />
    </svg>
  )
}

export function IconeAviso({ tamanho = 14, className }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </svg>
  )
}

export function IconeErro({ tamanho = 13, className }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6M12 16h.01" />
    </svg>
  )
}

// --- artboard `Alcadas` ------------------------------------------------------------------------

export function IconeEditar({ tamanho = 16, className }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className={className}>
      <path d="M4 20h4L19 9l-4-4L4 16v4z" />
    </svg>
  )
}

export function IconeRemover({ tamanho = 16, className }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className={className}>
      <path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  )
}

/** A alça de arrastar do artboard. Decorativa: a reordenação é pelos botões, que o teclado alcança. */
export function IconeAlca({ tamanho = 14, className }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </svg>
  )
}

export function IconeSetaBaixo({ tamanho = 14, className }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={className}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  )
}

export function IconeSetaCima({ tamanho = 14, className }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={className}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  )
}

export function IconeTirar({ tamanho = 14, className }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

/** A casa do estado vazio do artboard `Estados`, reusada quando não há obra nem faixa. */
export function IconeObra({ tamanho = 26, className }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className={className}>
      <path d="M3 21h18M5 21V8l7-5 7 5v13" />
      <path d="M10 21v-6h4v6" />
    </svg>
  )
}

/** O cadeado do bloco de acesso negado. Não está nos artboards: a tela 8 descreve o estado em texto. */
export function IconeCadeado({ tamanho = 26, className }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className={className}>
      <rect x="4.5" y="10" width="15" height="10" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </svg>
  )
}
