import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader } from './components/Loader'
import { ModelStage } from './components/ModelStage'
import { Nav } from './components/Nav'
import { Closing } from './components/sections/Closing'
import { Exploded } from './components/sections/Exploded'
import { Explorer } from './components/sections/Explorer'
import { Hero } from './components/sections/Hero'
import { Reveal } from './components/sections/Reveal'
import { Specimen } from './components/sections/Specimen'
import { useScrollChoreography } from './hooks/useScrollChoreography'
import { detectWebGL, isLowPower, useReducedMotion } from './lib/capabilities'
import { resetReport, setReport, useReport } from './lib/store'

const WEBGL_OK = detectWebGL()
const LOW_POWER = isLowPower()

export default function App() {
  const reduced = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const report = useReport()

  // 3D can be switched off by the visitor, by `?no3d` in the URL, or when WebGL is missing.
  const [wants3D, setWants3D] = useState(() => !new URLSearchParams(window.location.search).has('no3d'))
  const use3D = WEBGL_OK && wants3D && report.status !== 'error'

  // No WebGL, or `?no3d`: tell the rest of the page there is no model to wait for.
  useEffect(() => {
    if (!WEBGL_OK || !wants3D) setReport({ status: 'off' })
  }, [wants3D])

  const toggle3D = useCallback(() => {
    if (wants3D) {
      setReport({ status: 'off' })
      setWants3D(false)
    } else {
      resetReport()
      setWants3D(true)
    }
  }, [wants3D])
  useScrollChoreography(rootRef, reduced, true)

  return (
    <div className="app" ref={rootRef}>
      {use3D && <ModelStage reduced={reduced} lowPower={LOW_POWER} />}
      <Loader enabled={WEBGL_OK && wants3D} />
      <Nav use3D={use3D} canToggle3D={WEBGL_OK} onToggle3D={toggle3D} reduced={reduced} />
      <div className="progress" aria-hidden="true"><i className="progress__fill" /></div>

      <main>
        <Hero reduced={reduced} use3D={use3D} />
        <Reveal />
        <Exploded />
        <Explorer />
        <Specimen />
        <Closing reduced={reduced} />
      </main>
    </div>
  )
}
