import { useTheme, type ThemeMode } from '../lib/theme'
import { Icon, type IconName } from './Icon'

const OPTIONS: Array<{ mode: ThemeMode; icon: IconName; label: string }> = [
  { mode: 'light', icon: 'sun', label: 'Tema claro' },
  { mode: 'dark', icon: 'moon', label: 'Tema escuro' },
  { mode: 'system', icon: 'monitor', label: 'Seguir o sistema' },
]

export function ThemeToggle() {
  const [mode, setMode] = useTheme()
  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Tema">
      {OPTIONS.map((o) => (
        <button
          key={o.mode}
          type="button"
          role="radio"
          aria-checked={mode === o.mode}
          aria-label={o.label}
          title={o.label}
          onClick={() => setMode(o.mode)}
        >
          <Icon name={o.icon} size={15} />
        </button>
      ))}
    </div>
  )
}
