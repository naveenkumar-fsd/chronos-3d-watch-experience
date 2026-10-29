import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { COLORS } from '../config'
import { rig } from '../lib/store'

// Small seeded generator: the same dust field on every load, and no impure calls during render.
function seeded(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function Particles({ count, reduced }: { count: number; reduced: boolean }) {
  const group = useRef<THREE.Group>(null)
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const rand = seeded(1337)
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (rand() - 0.5) * 9
      arr[i * 3 + 1] = (rand() - 0.5) * 6
      arr[i * 3 + 2] = (rand() - 0.5) * 6 - 0.5
    }
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    return g
  }, [count])

  useFrame((state) => {
    const g = group.current
    if (!g || reduced) return
    const t = state.clock.elapsedTime
    g.rotation.y = t * 0.01 + rig.rotY * 0.12
    g.position.y = Math.sin(t * 0.15) * 0.1 + rig.explode * 0.05
  })

  return (
    <group ref={group}>
      <points geometry={geometry}>
        <pointsMaterial
          color={COLORS.gold}
          size={0.014}
          sizeAttenuation
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}
