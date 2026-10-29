import { goTo } from '../lib/scroll'

interface Props {
  use3D: boolean
  canToggle3D: boolean
  onToggle3D: () => void
  reduced: boolean
}

const LINKS = [
  { href: '#reveal', label: 'Reveal' },
  { href: '#anatomy', label: 'Anatomy' },
  { href: '#specimen', label: 'Specimen' },
  { href: '#contact', label: 'Contact' },
]

export function Nav({ use3D, canToggle3D, onToggle3D, reduced }: Props) {
  return (
    <header className="nav">
      <a
        className="nav__brand"
        href="#hero"
        onClick={(e) => {
          e.preventDefault()
          goTo('#hero', reduced)
        }}
        aria-label="CHRONOS, back to top"
      >
        CHRONOS
      </a>
      <nav className="nav__links" aria-label="Primary">
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            onClick={(e) => {
              e.preventDefault()
              goTo(l.href, reduced)
            }}
          >
            {l.label}
          </a>
        ))}
        {canToggle3D && (
          <button className="nav__toggle mono" onClick={onToggle3D} aria-pressed={use3D}>
            3D {use3D ? 'on' : 'off'}
          </button>
        )}
      </nav>
    </header>
  )
}
