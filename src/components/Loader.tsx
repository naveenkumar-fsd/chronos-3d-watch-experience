import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import gsap from 'gsap'
import { MODEL_URL } from '../config'
import { useReport } from '../lib/store'

export function Loader({ enabled }: { enabled: boolean }) {
  const report = useReport()
  const { progress } = useProgress()
  const ref = useRef<HTMLDivElement>(null)
  const [gone, setGone] = useState(false)

  const finished = !enabled || report.status === 'ready' || report.status === 'off'
  const failed = report.status === 'error'

  useEffect(() => {
    if (!finished || gone) return
    const el = ref.current
    if (!el) return
    const tween = gsap.to(el, { opacity: 0, duration: 0.8, ease: 'power2.out', delay: 0.15, onComplete: () => setGone(true) })
    return () => {
      tween.kill()
    }
  }, [finished, gone])

  if (gone) return null

  return (
    <div ref={ref} className="loader" role="status" aria-live="polite">
      <div className="loader__inner">
        <span className="mono loader__brand">CHRONOS</span>
        {failed ? (
          <div className="loader__error">
            <p className="loader__title">The 3D watch could not be loaded.</p>
            <p className="mono">{report.error}</p>
            <p className="mono">Check that the file exists at <b>public{MODEL_URL}</b>, then reload. The rest of the page remains available below.</p>
            <button className="btn" onClick={() => setGone(true)}>Continue without 3D</button>
          </div>
        ) : (
          <>
            <div className="loader__count" aria-hidden="true">{String(Math.round(progress)).padStart(3, '0')}</div>
            <div className="loader__bar"><span style={{ transform: `scaleX(${Math.max(0.02, progress / 100)})` }} /></div>
            <span className="mono loader__label">Calibrating the instrument</span>
          </>
        )}
      </div>
    </div>
  )
}
