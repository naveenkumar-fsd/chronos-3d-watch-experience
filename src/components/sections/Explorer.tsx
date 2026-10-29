import { useEffect, useRef } from 'react'
import { KIND_TEXT, KIND_TITLE } from '../../lib/descriptions'
import { setSelectedId, useReport, useSelectedId, type PartInfo } from '../../lib/store'

function Detail({ part }: { part: PartInfo }) {
  const identified = part.kind !== 'unknown'
  const pct = (n: number) => `${Math.round(n * 100)}%`
  return (
    <article className="detail" aria-live="polite">
      <span className="mono eyebrow">Component {String(part.index + 1).padStart(2, '0')}</span>
      <h3 className="display">{part.label}</h3>
      <p className="detail__kind mono">
        {KIND_TITLE[part.kind]}
        <em>
          {identified
            ? ` — identified from the name “${part.rawName}”`
            : ` — name “${part.rawName}” does not describe a role`}
        </em>
      </p>
      <p className="detail__text">{KIND_TEXT[part.kind]}</p>
      <dl className="facts mono">
        <div><dt>Meshes</dt><dd>{part.meshCount}</dd></div>
        <div><dt>Triangles</dt><dd>{part.triangles.toLocaleString()}</dd></div>
        <div><dt>Material</dt><dd>{part.materials.join(', ') || '—'}</dd></div>
        <div>
          <dt>Metalness / roughness</dt>
          <dd>{part.metalness === null ? '—' : `${part.metalness.toFixed(2)} / ${(part.roughness ?? 0).toFixed(2)}`}</dd>
        </div>
        <div><dt>Largest dimension</dt><dd>{pct(part.extent)} of the watch</dd></div>
      </dl>
    </article>
  )
}

export function Explorer() {
  const report = useReport()
  const selected = useSelectedId()
  const ref = useRef<HTMLElement>(null)

  // Selection is only meaningful while this section is on screen.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry && !entry.isIntersecting) setSelectedId(null)
      },
      { threshold: 0 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      setSelectedId(null)
    }
  }, [])

  const part = report.parts.find((p) => p.id === selected) ?? null
  const hasParts = report.status === 'ready' && report.parts.length > 0

  return (
    <section id="explorer" className="explorer" ref={ref}>
      <div className="explorer__grid">
        <div className="explorer__list">
          <span className="mono eyebrow">Fig. 03 &mdash; Anatomy</span>
          <h2 className="display">Select a <em>component.</em></h2>
          {hasParts ? (
            <ol className="parts">
              {report.parts.map((p) => (
                <li key={p.id}>
                  <button
                    className={`part${selected === p.id ? ' is-active' : ''}`}
                    aria-pressed={selected === p.id}
                    onClick={() => setSelectedId(p.id)}
                    onMouseEnter={() => setSelectedId(p.id)}
                    onFocus={() => setSelectedId(p.id)}
                  >
                    <span className="mono part__n">{String(p.index + 1).padStart(2, '0')}</span>
                    <span className="part__label">{p.label}</span>
                    <span className="mono part__kind">{KIND_TITLE[p.kind]}</span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mono muted">
              {report.status === 'loading' ? 'Reading the model…' : 'Component data needs the 3D model. Enable 3D, or check that the model file loads.'}
            </p>
          )}
        </div>

        <div className="explorer__detail">
          {part ? (
            <Detail part={part} />
          ) : (
            <p className="detail__empty mono">
              {hasParts ? 'Hover or select a part. It lights up on the watch and its measurements appear here.' : ''}
            </p>
          )}
          {hasParts && report.limitation && (
            <p className="notice mono"><b>Model limitation</b>{report.limitation}</p>
          )}
        </div>
      </div>
    </section>
  )
}
