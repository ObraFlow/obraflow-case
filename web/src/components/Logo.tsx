// Marca do ObraFlow: um "A" de obra (as duas pernas são a estrutura, no laranja
// da marca) com a viga em grafite. Mesmo desenho do favicon (web/public/favicon.svg).
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f2834a" />
          <stop offset="1" stopColor="#e5562a" />
        </linearGradient>
      </defs>
      <rect width="36" height="36" rx="10" fill="#fff" />
      <path d="M8 27 18 9l10 18" fill="none" stroke="url(#logo-grad)" strokeWidth="4.2" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M12.5 21h11" stroke="#1c1c1e" strokeWidth="3.6" strokeLinecap="round" />
    </svg>
  )
}
