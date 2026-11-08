import { author } from '../author'
import { Icon, type IconName } from './Icon'

export function AuthorCard({ className = '' }: { className?: string }) {
  return (
    <section className={`author ${className}`} aria-label="Sobre quem fez este projeto">
      <div className="author-head">
        <span className="author-avatar" aria-hidden="true">
          {author.initials}
        </span>
        <div>
          <strong>{author.name}</strong>
          <span>{author.role}</span>
        </div>
      </div>
      <ul className="author-links">
        {author.links.map((l) => (
          <li key={l.label}>
            <a href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" title={l.text}>
              <Icon name={l.icon as IconName} size={15} />
              <span>{l.label}</span>
            </a>
          </li>
        ))}
      </ul>
      <div className="author-meta">
        <a href={author.repo} target="_blank" rel="noreferrer">
          <Icon name="code" size={14} /> Código
        </a>
        <a href="/api/docs" target="_blank" rel="noreferrer">
          <Icon name="book" size={14} /> API
        </a>
      </div>
    </section>
  )
}
