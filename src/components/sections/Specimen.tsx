import { useReport } from '../../lib/store'

export function Specimen() {
  const report = useReport()
  const ready = report.status === 'ready'
  const dash = '—'

  return (
    <section id="specimen" className="specimen">
      <div className="specimen__grid">
        <header className="specimen__lead">
          <span className="mono eyebrow">Fig. 04 &mdash; Specimen notes</span>
          <h2 className="display">Made of <em>what you can see.</em></h2>
          <p>
            Everything on this page is read from the model file at load time. The figures below describe how this watch is
            built and rendered here. They are measurements of the model, not claims about a finished product.
          </p>
        </header>

        <div className="specimen__data">
          <dl className="ledger mono">
            <div><dt>Parts</dt><dd>{ready ? report.parts.length : dash}</dd></div>
            <div><dt>Meshes</dt><dd>{ready ? report.meshCount : dash}</dd></div>
            <div><dt>Triangles</dt><dd>{ready ? report.triangles.toLocaleString() : dash}</dd></div>
            <div><dt>Materials</dt><dd>{ready ? report.materials.length : dash}</dd></div>
          </dl>

          <h3 className="mono eyebrow">Material ledger</h3>
          {ready && report.materials.length > 0 ? (
            <ul className="materials">
              {report.materials.map((m) => (
                <li key={m.name}>
                  <i className="swatch" style={{ background: m.colorHex }} aria-hidden="true" />
                  <span className="materials__name">{m.name}</span>
                  <span className="mono materials__meta">
                    {m.metalness === null ? 'non-PBR' : `metal ${m.metalness.toFixed(2)} · rough ${(m.roughness ?? 0).toFixed(2)}`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mono muted">{ready ? 'The model carries no material data.' : 'Material data appears once the 3D model has loaded.'}</p>
          )}

          <p className="mono fine">
            Metalness and roughness are the physically-based values stored in the file. Lower roughness reads as a polished
            surface, higher as brushed or matte.
          </p>
        </div>
      </div>
    </section>
  )
}
