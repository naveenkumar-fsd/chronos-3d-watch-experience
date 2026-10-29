import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { MODEL_URL } from '../config'
import { prepareModel, updatePart, type PartRuntime } from '../lib/analyze'
import { fit, getSelectedId, rig, setReport } from '../lib/store'

interface Props {
  reduced: boolean
  /** Receives the measured parts so annotations can follow them. */
  onParts: (parts: PartRuntime[]) => void
}

const TAU = Math.PI * 2
const MAX_PITCH = 0.55 // about 31 degrees of vertical inspection

/**
 * The visitor's own rotation. It lives on its own group, between the scroll-driven rig
 * and the model, so GSAP (which only writes `rig`) and the exploded-view lerp
 * (which only moves part nodes) never touch it and it never touches them.
 */
interface UserSpin {
  yaw: number
  pitch: number
  yawTarget: number
  pitchTarget: number
  /** Release momentum, radians per second. */
  vel: number
  dragging: boolean
  /** 0..1, eases in while dragging; used to calm the pointer parallax. */
  grip: number
}

interface ActiveDrag {
  id: number
  touch: boolean
  startX: number
  startY: number
  lastX: number
  lastY: number
  lastT: number
  engaged: boolean
}

export function WatchModel({ reduced, onParts }: Props) {
  const { scene } = useGLTF(MODEL_URL)
  // Work on a clone so the cached GLTF is never modified (safe with React StrictMode).
  const root = useMemo(() => scene.clone(true), [scene])

  const rigRef = useRef<THREE.Group>(null)
  const spinRef = useRef<THREE.Group>(null)
  const orientRef = useRef<THREE.Group>(null)
  const spin = useRef<UserSpin>({ yaw: 0, pitch: 0, yawTarget: 0, pitchTarget: 0, vel: 0, dragging: false, grip: 0 })
  const partsRef = useRef<PartRuntime[]>([])
  const camDist = useRef(0)
  const pointer = useRef({ x: 0, y: 0 })

  const size = useThree((s) => s.size)
  const getState = useThree((s) => s.get)

  useLayoutEffect(() => {
    const rigGroup = rigRef.current
    const orient = orientRef.current
    if (!rigGroup || !orient) return

    const prepared = prepareModel(root, orient, rigGroup)
    partsRef.current = prepared.parts
    fit.halfW = prepared.fit.halfW
    fit.halfH = prepared.fit.halfH
    setReport({ ...prepared.report, status: 'ready', error: null })
    onParts(prepared.parts)

    // Helpful for inspecting your own model: open the browser console.
    console.groupCollapsed(`[CHRONOS] model analysis: ${prepared.parts.length} parts (${prepared.report.groupedBy})`)
    console.table(
      prepared.parts.map((p) => ({
        part: p.info.label,
        raw: p.info.rawName,
        kind: p.info.kind,
        meshes: p.info.meshCount,
        triangles: p.info.triangles,
        materials: p.info.materials.join(', '),
      })),
    )
    console.log('normalised size', prepared.report.dims.map((d) => +d.toFixed(2)))
    if (prepared.report.limitation) console.warn(prepared.report.limitation)
    console.groupEnd()

    return () => {
      prepared.dispose()
      partsRef.current = []
      onParts([])
    }
  }, [root, onParts])

  // Track pointer in normalised device coordinates without re-rendering.
  useLayoutEffect(() => {
    if (reduced) return
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [reduced])

  // Drag-to-rotate. The canvas sits behind the page (pointer-events: none), so the gesture is
  // read from the window and only starts when the press lands on the watch itself.
  useEffect(() => {
    const u = spin.current
    const html = document.documentElement
    const prevTouchAction = html.style.touchAction
    // Vertical swipes keep scrolling the page; horizontal swipes are delivered to us.
    html.style.touchAction = 'pan-y pinch-zoom'

    const box = new THREE.Box3()
    const corner = new THREE.Vector3()
    const INTERACTIVE = 'a, button, input, select, textarea, label, summary, [role="button"], [contenteditable], .nav, .parts'
    let active: ActiveDrag | null = null
    let cursor: '' | 'grab' | 'grabbing' = ''

    const setCursor = (c: '' | 'grab' | 'grabbing') => {
      if (c === cursor) return
      cursor = c
      html.style.cursor = c
    }

    // Is the point over the watch? Uses the screen-space bounds of the watch's current
    // world box, so it follows the exploded parts and the scroll-driven camera.
    const overWatch = (cx: number, cy: number) => {
      const rigGroup = rigRef.current
      if (!rigGroup || partsRef.current.length === 0) return false
      box.setFromObject(rigGroup)
      if (box.isEmpty()) return false
      const { camera } = getState()
      camera.updateMatrixWorld()
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      for (let i = 0; i < 8; i++) {
        corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera)
        minX = Math.min(minX, corner.x)
        maxX = Math.max(maxX, corner.x)
        minY = Math.min(minY, corner.y)
        maxY = Math.max(maxY, corner.y)
      }
      const nx = (cx / window.innerWidth) * 2 - 1
      const ny = -((cy / window.innerHeight) * 2 - 1)
      const pad = 0.04
      return nx >= minX - pad && nx <= maxX + pad && ny >= minY - pad && ny <= maxY + pad
    }

    const isInteractive = (t: EventTarget | null) => t instanceof Element && t.closest(INTERACTIVE) !== null

    const rotPerPx = () => TAU / Math.max(520, Math.min(window.innerWidth, 1000) * 0.85)

    const engage = (d: ActiveDrag) => {
      d.engaged = true
      u.dragging = true
      u.vel = 0
      // Wrap to the nearest full turn so the target never carries a huge accumulated angle.
      const turns = Math.round(u.yawTarget / TAU) * TAU
      u.yawTarget -= turns
      u.yaw -= turns
      window.getSelection()?.removeAllRanges()
      setCursor('grabbing')
    }

    const release = (keepMomentum: boolean) => {
      if (active?.engaged) {
        u.dragging = false
        if (!keepMomentum || reduced) u.vel = 0
        else if (performance.now() - active.lastT > 90) u.vel = 0 // paused before letting go: no fling
        u.vel = THREE.MathUtils.clamp(u.vel, -9, 9)
      }
      active = null
      setCursor('')
    }

    const onDown = (e: PointerEvent) => {
      if (active || !e.isPrimary) return
      const touch = e.pointerType !== 'mouse'
      if (!touch && e.button !== 0) return
      if (isInteractive(e.target) || !overWatch(e.clientX, e.clientY)) return
      active = { id: e.pointerId, touch, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, lastT: performance.now(), engaged: false }
    }

    const onMove = (e: PointerEvent) => {
      if (!active) {
        // Cursor hint only (no rotation without a press).
        if (e.pointerType === 'mouse') setCursor(!isInteractive(e.target) && overWatch(e.clientX, e.clientY) ? 'grab' : '')
        return
      }
      if (e.pointerId !== active.id) return
      const d = active

      if (!d.engaged) {
        const dx0 = e.clientX - d.startX
        const dy0 = e.clientY - d.startY
        if (Math.hypot(dx0, dy0) < (d.touch ? 8 : 3)) return
        // On touch, a mostly vertical start is a page scroll: leave it alone.
        if (d.touch && Math.abs(dy0) > Math.abs(dx0)) {
          active = null
          return
        }
        engage(d)
      }

      const dx = e.clientX - d.lastX
      const dy = e.clientY - d.lastY
      const now = performance.now()
      const dt = Math.max(0.008, (now - d.lastT) / 1000)
      d.lastX = e.clientX
      d.lastY = e.clientY
      d.lastT = now

      const k = rotPerPx()
      u.yawTarget += dx * k
      u.pitchTarget = THREE.MathUtils.clamp(u.pitchTarget + dy * k * (d.touch ? 0.35 : 0.5), -MAX_PITCH, MAX_PITCH)
      u.vel = THREE.MathUtils.lerp(u.vel, (dx * k) / dt, 0.35)
    }

    const onUp = (e: PointerEvent) => {
      if (active && e.pointerId === active.id) release(e.type === 'pointerup')
    }
    const onBlur = () => release(false)
    const stopSelect = (e: Event) => {
      if (active && !active.touch) e.preventDefault()
    }

    // Scrolling on eases the visitor's angle back into the scripted choreography,
    // so labels and camera framing in later sections always match the story.
    let lastScroll = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      const dist = Math.abs(y - lastScroll)
      lastScroll = y
      if (u.dragging || dist === 0) return
      if (u.yawTarget === 0 && u.pitchTarget === 0 && u.vel === 0) return
      const turns = Math.round(u.yawTarget / TAU) * TAU // never unwind the long way round
      u.yawTarget -= turns
      u.yaw -= turns
      const keep = 1 - Math.min(1, dist / (window.innerHeight * 0.5))
      u.yawTarget *= keep
      u.pitchTarget *= keep
      u.vel *= keep
      if (Math.abs(u.yawTarget) < 0.004) u.yawTarget = 0
      if (Math.abs(u.pitchTarget) < 0.004) u.pitchTarget = 0
    }

    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('blur', onBlur)
    window.addEventListener('selectstart', stopSelect)
    window.addEventListener('dragstart', stopSelect)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('selectstart', stopSelect)
      window.removeEventListener('dragstart', stopSelect)
      window.removeEventListener('scroll', onScroll)
      u.dragging = false
      u.vel = 0
      html.style.touchAction = prevTouchAction
      html.style.cursor = ''
    }
  }, [reduced, getState])

  useFrame((state, delta) => {
    const rigGroup = rigRef.current
    if (!rigGroup) return
    const dt = Math.min(delta, 0.05)
    const cam = state.camera as THREE.PerspectiveCamera
    const aspect = size.width / size.height
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)

    // --- Camera fit (automatic, based on the measured model) ---
    const distV = (fit.halfH * 1.3) / tanHalf
    const distH = (fit.halfW * 1.35) / (tanHalf * aspect)
    const base = Math.max(distV, distH)
    const narrowView = aspect < 0.9
    // On tall/narrow screens the exploded stack is wider than the frame, so back the camera off.
    // Keep the model comfortably inside the viewport. The exploded view gets a smaller extra camera pull-back on narrow screens.
    const wanted = base * 1.28 * rig.dist * (1 + (narrowView ? rig.explode * 0.5 : 0))
    camDist.current = camDist.current === 0 ? wanted : THREE.MathUtils.damp(camDist.current, wanted, 7, dt)

    // --- Visitor rotation: momentum after release, then ease toward the target angle ---
    const u = spin.current
    if (!u.dragging && u.vel !== 0) {
      u.yawTarget += u.vel * dt
      u.vel *= Math.exp(-3.2 * dt)
      if (Math.abs(u.vel) < 0.02) u.vel = 0
    }
    u.grip = THREE.MathUtils.damp(u.grip, u.dragging ? 1 : 0, 8, dt)
    u.yaw = THREE.MathUtils.damp(u.yaw, u.yawTarget, u.dragging ? 24 : 14, dt)
    u.pitch = THREE.MathUtils.damp(u.pitch, u.pitchTarget, u.dragging ? 24 : 14, dt)
    spinRef.current?.rotation.set(u.pitch, u.yaw, 0)

    // The pointer parallax would add its own tilt while the visitor is turning the watch.
    const calm = 1 - u.grip
    const px = reduced ? 0 : pointer.current.x * calm
    const py = reduced ? 0 : pointer.current.y * calm
    cam.position.set(px * 0.18 * camDist.current * 0.1, -py * 0.12 * camDist.current * 0.1, camDist.current)
    cam.lookAt(0, 0, 0)

    // --- Watch transform ---
    const halfW = tanHalf * camDist.current * aspect
    const halfH = tanHalf * camDist.current
    const narrow = aspect < 0.9
    const targetX = narrow ? 0 : rig.x * halfW
    const targetY = narrow ? halfH * 0.3 : 0
    const t = state.clock.elapsedTime
    const float = reduced ? 0 : Math.sin(t * 0.7) * 0.02
    rigGroup.position.x = THREE.MathUtils.damp(rigGroup.position.x, targetX, 7, dt)
    rigGroup.position.y = THREE.MathUtils.damp(rigGroup.position.y, targetY + float, 7, dt)
    const driftY = reduced ? 0 : Math.sin(t * 0.3) * 0.05 + px * 0.2
    const driftX = reduced ? 0 : py * 0.1
    rigGroup.rotation.y = THREE.MathUtils.damp(rigGroup.rotation.y, rig.rotY + driftY, 6, dt)
    rigGroup.rotation.x = THREE.MathUtils.damp(rigGroup.rotation.x, rig.rotX + driftX, 6, dt)

    // --- Exploded view: lerp between the ORIGINAL and exploded positions of real nodes ---
    const selected = getSelectedId()
    for (const p of partsRef.current) updatePart(p, rig.explode, selected === p.info.id, dt)
  })

  return (
    <group ref={rigRef}>
      <group ref={spinRef}>
        <group ref={orientRef}>
          <primitive object={root} />
        </group>
      </group>
    </group>
  )
}
