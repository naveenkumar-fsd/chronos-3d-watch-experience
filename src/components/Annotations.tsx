import { useMemo, useRef, type CSSProperties } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { rig } from '../lib/store'
import type { PartRuntime } from '../lib/analyze'

const tmp = new THREE.Vector3()

function Tag({ part, number, side, slot }: { part: PartRuntime; number: number; side: 'left' | 'right'; slot: number }) {
  const group = useRef<THREE.Group>(null)
  const el = useRef<HTMLDivElement>(null)
  const last = useRef(-1)

  useFrame(() => {
    const g = group.current
    if (g) g.position.copy(part.node.localToWorld(tmp.copy(part.centerLocal)))
    const node = el.current
    if (node) {
      // Fade in only once the part has actually separated.
      const o = Math.round(rig.labels * Math.min(1, rig.explode * 1.4) * 100) / 100
      if (o !== last.current) {
        last.current = o
        node.style.opacity = String(o)
        node.style.transform = `translateY(${(1 - o) * 8 + (slot % 3 - 1) * 16}px)`
      }
    }
  })

  return (
    <group ref={group}>
      <Html zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
        <div className="tagwrap">
        <div ref={el} className={`tag tag--${side}`} style={{ opacity: 0, '--len': `${44 + (slot % 4) * 26}px` } as CSSProperties}>
          <span className="tag__dot" />
          <span className="tag__line" />
          <span className="tag__text">
            <i>{String(number).padStart(2, '0')}</i>
            {part.info.label}
          </span>
        </div>
        </div>
      </Html>
    </group>
  )
}

export function Annotations({ parts }: { parts: PartRuntime[] }) {
  const narrow = window.innerWidth < 760
  const shown = useMemo(() => {
    const limit = narrow ? 4 : 8
    const ranked = [...parts].sort((a, b) => b.diag - a.diag).slice(0, limit)
    return ranked.sort((a, b) => a.info.index - b.info.index)
  }, [parts, narrow])

  return (
    <>
      {shown.map((p, i) => (
        <Tag key={p.info.id} part={p} number={p.info.index + 1} side={narrow || i % 2 === 1 ? 'left' : 'right'} slot={i} />
      ))}
    </>
  )
}
