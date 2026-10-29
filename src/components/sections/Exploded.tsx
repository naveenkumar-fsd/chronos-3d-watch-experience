import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { rig, useReport } from '../../lib/store'

export function Exploded() {
  const report = useReport()
  const readout = useRef<HTMLSpanElement>(null)
  const bar = useRef<HTMLElement>(null)

  // Live separation readout, driven by the same value that moves the 3D parts.
  useEffect(() => {
    let last = -1
    const tick = () => {
      const v = Math.round(rig.explode * 100)
      if (v === last) return
      last = v
      if (readout.current) readout.current.textContent = String(v).padStart(3, '0')
      if (bar.current) bar.current.style.transform = `scaleX(${v / 100})`
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])

  return (
    <section id="anatomy" className="tall exploded">
      <div className="sticky">
        <div className="frame-ticks" aria-hidden="true"><span /><span /><span /><span /></div>

        <header className="exploded__head">
          <span className="mono eyebrow">Fig. 02 &mdash; Exploded view</span>
          <h2 className="display">Every part, <em>in its place.</em></h2>
        </header>

        <div className="exploded__readout mono">
          <div className="exploded__row">
            <span>Separation</span>
            <b><span ref={readout}>000</span>%</b>
          </div>
          <i className="exploded__bar" ref={bar} />
          <div className="exploded__row">
            <span>Parts</span>
            <b>{report.status === 'ready' ? String(report.parts.length).padStart(2, '0') : '—'}</b>
          </div>
        </div>

        {report.status === 'ready' && report.limitation && (
          <aside className="notice mono" role="note">
            <b>Model limitation</b>
            {report.limitation}
          </aside>
        )}
        {report.status === 'ready' && report.groupedBy === 'material' && (
          <aside className="notice mono" role="note">
            <b>Grouped by material</b>
            This file contains many small meshes, so they are grouped by material to keep the view readable. Each mesh keeps its original position.
          </aside>
        )}
      </div>
    </section>
  )
}
