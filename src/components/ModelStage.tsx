import { Suspense, useCallback, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { MODEL_URL } from '../config'
import type { PartRuntime } from '../lib/analyze'
import { setReport, useReport } from '../lib/store'
import { Annotations } from './Annotations'
import { ErrorBoundary } from './ErrorBoundary'
import { Particles } from './Particles'
import { WatchModel } from './WatchModel'

interface Props {
  reduced: boolean
  lowPower: boolean
}

/** One fixed canvas behind the whole page; scroll choreography drives it through `rig`. */
export function ModelStage({ reduced, lowPower }: Props) {
  const [parts, setParts] = useState<PartRuntime[]>([])
  const onParts = useCallback((p: PartRuntime[]) => setParts(p), [])
  const ready = useReport().status === 'ready'

  const onError = useCallback((error: Error) => {
    console.error('[CHRONOS] 3D failed:', error)
    setReport({
      status: 'error',
      error: `Could not load or display ${MODEL_URL}. ${error.message}`,
    })
  }, [])

  return (
    <div className="stage" aria-hidden="true">
      <ErrorBoundary onError={onError}>
        <Canvas
          camera={{ fov: 30, near: 0.1, far: 60, position: [0, 0, 8] }}
          dpr={lowPower ? [1, 1.25] : [1, 2]}
          gl={{ antialias: !lowPower, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', (e) => {
              e.preventDefault()
              setReport({ status: 'error', error: 'The graphics context was lost. Reload the page to restore the 3D view.' })
            })
          }}
        >
          <Suspense fallback={null}>
            {/* Studio lighting built from light-forms: no network request needed. */}
            <Environment resolution={256} frames={1} environmentIntensity={0.9}>
              <color attach="background" args={['#050506']} />
              <Lightformer form="rect" intensity={6} position={[0, 5, 2]} scale={[10, 2, 1]} rotation-x={Math.PI / 2} />
              <Lightformer form="rect" intensity={3} position={[-5, 1, 1]} scale={[2, 6, 1]} rotation-y={Math.PI / 2} />
              <Lightformer form="rect" intensity={2.2} position={[5, 0, -2]} scale={[1.5, 6, 1]} rotation-y={-Math.PI / 2} color="#c9a96a" />
              <Lightformer form="ring" intensity={3} position={[0, 0, 6]} scale={4} color="#ffffff" />
              <Lightformer form="rect" intensity={1} position={[0, -5, 0]} scale={[10, 2, 1]} rotation-x={-Math.PI / 2} />
            </Environment>
            <ambientLight intensity={0.15} />
            <directionalLight position={[3, 4, 5]} intensity={1.4} color="#fff4e0" />
            <spotLight position={[-4, 2, -3]} angle={0.5} penumbra={1} intensity={60} color="#c9a96a" distance={20} decay={2} />
            <WatchModel reduced={reduced} onParts={onParts} />
            <Annotations parts={parts} />
            {!lowPower && <Particles count={260} reduced={reduced} />}
          </Suspense>
        </Canvas>
      </ErrorBoundary>
      {/* Hint only: the stage has pointer-events: none, so it never blocks dragging the watch. */}
      {ready && (
        <div className="dragcue mono">
          <span className="dragcue__in">
            <svg viewBox="0 0 28 10" aria-hidden="true"><path d="M1 5h26M5 1 1 5l4 4M23 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
            Drag to explore
          </span>
        </div>
      )}
    </div>
  )
}
