// Ícones de traço único, no mesmo estilo, sem carregar uma biblioteca inteira.
// Alguns seguem o desenho do Feather (MIT).
const paths = {
  plus: ['M12 5v14M5 12h14'],
  check: ['m5 12.5 4.5 4.5L19 7.5'],
  x: ['M6 6l12 12M18 6 6 18'],
  up: ['m6 14 6-6 6 6'],
  down: ['m6 10 6 6 6-6'],
  trash: ['M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12'],
  edit: ['m14.5 5.5 4 4L9 19H5v-4z'],
  alert: ['M12 8v5M12 16.5v.5M10.3 4.2 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z'],
  info: ['M12 11v6M12 7.5v.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z'],
  inbox: ['M3 13h5l1.5 3h5L16 13h5M5 5h14l2 8v6H3v-6z'],
  refresh: ['M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6'],
  file: ['M7 3h7l5 5v13H7zM14 3v5h5'],
  layers: ['m12 3 9 5-9 5-9-5zM3 13l9 5 9-5'],
  arrowRight: ['M5 12h14M13 6l6 6-6 6'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0'],
  clock: ['M12 7v5l3 2', 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z'],
  redo: ['M4 12a8 8 0 0 1 14-5.3L20 9', 'M20 4v5h-5', 'M20 12a8 8 0 0 1-14 5.3L4 15'],
  whatsapp: ['M3.5 20.5 5 16a8.5 8.5 0 1 1 3.2 3.2z', 'M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-1.9-1-1 .8a4 4 0 0 1-2.2-2.2l.8-1-1-1.9z'],
  globe: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M3 12h18', 'M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18Z'],
  github: [
    'M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21',
  ],
  mail: ['M4 5h16v14H4z', 'm4 6 8 7 8-7'],
  linkedin: ['M4 9h4v11H4z', 'M6 4.5v.5', 'M11 20v-6a3 3 0 0 1 6 0v6M11 9v11', 'M17 20v-6'],
  code: ['m8 7-5 5 5 5M16 7l5 5-5 5'],
  book: ['M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z', 'M5 17a3 3 0 0 1 3-3h11'],
  sun: [
    'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  ],
  moon: ['M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z'],
  chart: ['M4 20V10M10 20V4M16 20v-7M22 20H2'],
  monitor: ['M3 4h18v12H3z', 'M8 20h8M12 16v4'],
} as const

export type IconName = keyof typeof paths

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
