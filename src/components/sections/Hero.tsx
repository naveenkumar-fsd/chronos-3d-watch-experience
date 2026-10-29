import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { useReport } from '../../lib/store'
import { goTo } from '../../lib/scroll'

export function Hero({ reduced, use3D }: { reduced: boolean; use3D: boolean }) {
  const ref = useRef<HTMLElement>(null)
  const report = useReport()
  const ready = report.status !== 'loading'

  // Hide intro elements until the loader has finished.
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set('.hero .line > span', { yPercent: 115 })
      gsap.set('.hero .intro', { autoAlpha: 0, y: 18 })
    }, ref)
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!ready) return
    const ctx = gsap.context(() => {
      if (reduced) {
        gsap.set('.hero .line > span', { yPercent: 0 })
        gsap.set('.hero .intro', { autoAlpha: 1, y: 0 })
        return
      }
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.2 })
      tl.to('.hero .line > span', { yPercent: 0, duration: 1.3, stagger: 0.14 }, 0)
        .to('.hero .intro', { autoAlpha: 1, y: 0, duration: 1, stagger: 0.12 }, 0.5)
    }, ref)
    return () => ctx.revert()
  }, [ready, reduced])

  return (
    <section id="hero" className="hero" ref={ref}>
      <div className="hero__frame" aria-hidden="true">
        <span /><span /><span /><span />
      </div>

      <div className="hero__copy">
        <p className="mono eyebrow intro">Fig. 00 &mdash; The assembled instrument</p>
        <h1 className="display">
          <span className="line"><span>Time,</span></span>
          <span className="line"><span>taken <em>apart.</em></span></span>
        </h1>
        <p className="lede intro">
          A dive chronometer, examined the way a watchmaker would: closer, turned over, and separated part by part.
        </p>
        <button className="cta intro" onClick={() => goTo('#reveal', reduced)}>
          <span>Begin the descent</span>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 4v15m0 0-6-6m6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
        </button>
      </div>

      <dl className="hero__meta mono intro" aria-label="Model data">
        <div><dt>Parts</dt><dd>{report.status === 'ready' ? report.parts.length : '—'}</dd></div>
        <div><dt>Triangles</dt><dd>{report.status === 'ready' ? report.triangles.toLocaleString() : '—'}</dd></div>
        <div><dt>View</dt><dd>{use3D && report.status !== 'error' ? 'Live 3D' : 'Static'}</dd></div>
      </dl>

      {(!use3D || report.status === 'error') && (
        <div className="fallback3d" role="img" aria-label="3D view unavailable">
          <svg viewBox="0 0 200 200" aria-hidden="true">
            <circle cx="100" cy="100" r="92" />
            <circle cx="100" cy="100" r="76" />
            <circle cx="100" cy="100" r="58" />
            <path d="M100 100V52M100 100l30 18" />
            <path d="M100 8v10M100 182v10M8 100h10M182 100h10" />
          </svg>
          <span className="mono">3D view unavailable on this device</span>
        </div>
      )}

      <div className="scrollcue mono" aria-hidden="true">
        <span>Scroll</span>
        <i />
      </div>
    </section>
  )
}
