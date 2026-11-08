// Iniciais com uma cor estável por pessoa (o matiz sai do id), em oklch para
// manter o mesmo contraste em qualquer cor e nos dois temas.
export function Avatar({ person, size = 32 }: { person: { id: number; name: string }; size?: number }) {
  const initials = person.name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
  return (
    <span className="avatar" style={{ '--h': (person.id * 67) % 360, '--size': `${size}px` } as React.CSSProperties} aria-hidden="true">
      {initials}
    </span>
  )
}
