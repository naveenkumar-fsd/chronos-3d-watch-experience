import * as THREE from 'three'
import { MODEL_CONFIG } from '../config'
import { classify } from './descriptions'
import type { MaterialInfo, ModelReport, PartInfo } from './store'

/**
 * Turns a loaded GLB scene into a set of independently animatable "parts".
 *
 * Nothing is faked: a part is either an actual node/mesh from the file, or (only when the
 * file has too many meshes) a group that we create ourselves and fill with the file's own
 * meshes using Object3D.attach(), which preserves each mesh's world transform.
 */

interface MatState {
  mat: THREE.MeshStandardMaterial
  baseColor: THREE.Color
  baseIntensity: number
}

export interface PartRuntime {
  info: PartInfo
  node: THREE.Object3D
  orig: THREE.Vector3
  exploded: THREE.Vector3
  /** Centre of the part's bounding box in the part's own space (for annotations). */
  centerLocal: THREE.Vector3
  diag: number
  delay: number
  mats: MatState[]
  hl: number
}

export interface PreparedModel {
  parts: PartRuntime[]
  report: Omit<ModelReport, 'status' | 'error'>
  fit: { halfW: number; halfH: number }
  dispose: () => void
}

const isMesh = (o: THREE.Object3D): o is THREE.Mesh => (o as THREE.Mesh).isMesh === true

function meshesOf(node: THREE.Object3D): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  node.traverse((c) => {
    if (isMesh(c)) out.push(c)
  })
  return out
}

function triangleCount(m: THREE.Mesh): number {
  const g = m.geometry
  if (g.index) return Math.floor(g.index.count / 3)
  const p = g.getAttribute('position')
  return p ? Math.floor(p.count / 3) : 0
}

function materialsOf(m: THREE.Mesh): THREE.Material[] {
  return Array.isArray(m.material) ? m.material : [m.material]
}

function isStandard(m: THREE.Material): m is THREE.MeshStandardMaterial {
  return (m as THREE.MeshStandardMaterial).isMeshStandardMaterial === true
}

const GENERIC_NAME = /^(object|mesh|node|group|geometry|scene|root|sketchfab|obj|cube|cylinder|sphere|plane|polysurface|default)[\s_.-]*\d*$/i

function prettify(raw: string): string {
  const cleaned = raw
    .replace(/[_.]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+\d+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return ''
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

function firstUsefulName(node: THREE.Object3D): string {
  if (node.name && !GENERIC_NAME.test(node.name)) return node.name
  for (const m of meshesOf(node)) {
    if (m.name && !GENERIC_NAME.test(m.name)) return m.name
  }
  return ''
}

/** Walks down the hierarchy until there are enough separate parts to explode. */
function pickNodes(root: THREE.Object3D): THREE.Object3D[] {
  const hasMesh = (o: THREE.Object3D) => meshesOf(o).length > 0
  let level: THREE.Object3D[] = [root]
  for (let i = 0; i < 10; i++) {
    if (level.length >= MODEL_CONFIG.minParts) break
    const next: THREE.Object3D[] = []
    let expanded = false
    for (const n of level) {
      if (isMesh(n)) {
        next.push(n)
        continue
      }
      const kids = n.children.filter(hasMesh)
      if (kids.length === 0) {
        next.push(n)
        continue
      }
      next.push(...kids)
      expanded = true
    }
    if (!expanded) break
    if (next.length > MODEL_CONFIG.maxParts) return level
    level = next
  }
  return level
}

export function prepareModel(
  root: THREE.Object3D,
  orient: THREE.Group,
  rigGroup: THREE.Group,
): PreparedModel {
  // Work with the rig group at identity so measurements are in a stable frame.
  const saved = {
    p: rigGroup.position.clone(),
    q: rigGroup.quaternion.clone(),
    s: rigGroup.scale.clone(),
  }
  rigGroup.position.set(0, 0, 0)
  rigGroup.quaternion.identity()
  rigGroup.scale.set(1, 1, 1)
  orient.position.set(0, 0, 0)
  orient.quaternion.identity()
  orient.scale.set(1, 1, 1)
  rigGroup.updateMatrixWorld(true)

  // ---- 1. Orientation ----
  // The selected Innerscene Dive Watch GLB has named Dial/Bezel meshes
  // aligned in the XY plane, with the dial facing +Z and the strap extending
  // along Y. The whole-model bounding box is misleading because the curved
  // strap makes the X dimension appear thinnest. Preserve the model's authored
  // orientation instead of guessing from the full bounding box.
  const q = new THREE.Quaternion()
  const [ex, ey, ez] = MODEL_CONFIG.extraRotationDeg
  if (ex || ey || ez) {
    const extra = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(THREE.MathUtils.degToRad(ex), THREE.MathUtils.degToRad(ey), THREE.MathUtils.degToRad(ez)),
    )
    q.premultiply(extra)
  }
  if (MODEL_CONFIG.flipFace) {
    q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI))
  }

  // ---- 2. Centre and scale ----
  orient.quaternion.copy(q)
  rigGroup.updateMatrixWorld(true)
  const box1 = new THREE.Box3().setFromObject(root, true)
  const size1 = box1.getSize(new THREE.Vector3())
  const center1 = box1.getCenter(new THREE.Vector3())
  const s = MODEL_CONFIG.targetSize / Math.max(size1.x, size1.y, size1.z, 1e-6)
  orient.scale.setScalar(s)
  orient.position.copy(center1).multiplyScalar(-s)
  rigGroup.updateMatrixWorld(true)
  const dims: [number, number, number] = [size1.x * s, size1.y * s, size1.z * s]

  // ---- 3. Choose parts ----
  const allMeshes = meshesOf(root)
  let nodes = pickNodes(root)
  let groupedBy: ModelReport['groupedBy'] = 'hierarchy'
  const createdGroups: THREE.Group[] = []
  const reparented: { mesh: THREE.Mesh; parent: THREE.Object3D }[] = []

  if (nodes.length < MODEL_CONFIG.minParts && allMeshes.length >= MODEL_CONFIG.minParts) {
    if (allMeshes.length <= MODEL_CONFIG.maxParts * 2) {
      nodes = allMeshes
      groupedBy = 'meshes'
    } else {
      // Too many meshes: regroup by material name; world transforms are preserved by attach().
      const byMat = new Map<string, THREE.Mesh[]>()
      for (const m of allMeshes) {
        const key = materialsOf(m)[0]?.name || materialsOf(m)[0]?.uuid || 'material'
        const list = byMat.get(key) ?? []
        list.push(m)
        byMat.set(key, list)
      }
      if (byMat.size >= 2) {
        nodes = []
        byMat.forEach((list, key) => {
          const g = new THREE.Group()
          g.name = key
          orient.add(g)
          // attach() needs up-to-date matrices
          orient.updateMatrixWorld(true)
          for (const m of list) {
            reparented.push({ mesh: m, parent: m.parent ?? orient })
            g.attach(m)
          }
          createdGroups.push(g)
          nodes.push(g)
        })
        groupedBy = 'material'
      }
    }
  }
  if (nodes.length === 1 && nodes[0] === root) groupedBy = 'none'
  // The part list must never contain the root itself as a "part" of a bigger set.
  rigGroup.updateMatrixWorld(true)

  // ---- 4. Per-part measurements ----
  const matClones: THREE.Material[] = []
  const parts: PartRuntime[] = []
  const tmpBox = new THREE.Box3()
  const tmpV = new THREE.Vector3()
  const materialMap = new Map<string, MaterialInfo>()
  let totalTris = 0

  nodes.forEach((node, index) => {
    const meshes = isMesh(node) ? [node, ...meshesOf(node).filter((m) => m !== node)] : meshesOf(node)
    let tris = 0
    const matNames: string[] = []
    const mats: MatState[] = []
    let metalness: number | null = null
    let roughness: number | null = null
    let colorHex: string | null = null

    for (const mesh of meshes) {
      tris += triangleCount(mesh)
      // Clone materials per mesh so highlighting never leaks into the cached GLTF.
      const cloned = materialsOf(mesh).map((m) => {
        const c = m.clone()
        matClones.push(c)
        return c
      })
      mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0]!
      for (const c of cloned) {
        const name = (c.name || 'Unnamed material').replace(/_+/g, ' ').trim()
        if (!matNames.includes(name)) matNames.push(name)
        if (isStandard(c)) {
          if (metalness === null) metalness = c.metalness
          if (roughness === null) roughness = c.roughness
          if (colorHex === null) colorHex = `#${c.color.getHexString()}`
          c.envMapIntensity = Math.max(c.envMapIntensity, 1.25)
          mats.push({ mat: c, baseColor: c.emissive.clone(), baseIntensity: c.emissiveIntensity })
          const existing = materialMap.get(name)
          if (existing) existing.usedBy += 1
          else
            materialMap.set(name, {
              name,
              colorHex: `#${c.color.getHexString()}`,
              metalness: c.metalness,
              roughness: c.roughness,
              usedBy: 1,
            })
        } else if (!materialMap.has(name)) {
          materialMap.set(name, { name, colorHex: '#888888', metalness: null, roughness: null, usedBy: 1 })
        }
      }
    }
    totalTris += tris

    tmpBox.setFromObject(node, true)
    const size = tmpBox.getSize(new THREE.Vector3())
    const centerWorld = tmpBox.getCenter(new THREE.Vector3())
    const centerLocal = node.worldToLocal(tmpV.copy(centerWorld)).clone()

    const rawName = firstUsefulName(node)
    const cls = classify(rawName, ...matNames)
    const label = prettify(rawName) || `Component ${String(index + 1).padStart(2, '0')}`

    parts.push({
      info: {
        id: `part-${index}`,
        index,
        rawName: rawName || '(unnamed)',
        label,
        kind: cls.kind,
        matched: cls.matched,
        meshCount: meshes.length,
        triangles: tris,
        materials: matNames,
        metalness,
        roughness,
        colorHex,
        size: [size.x, size.y, size.z],
        extent: Math.max(size.x, size.y, size.z) / MODEL_CONFIG.targetSize,
      },
      node,
      orig: node.position.clone(),
      exploded: node.position.clone(),
      centerLocal,
      diag: size.length(),
      delay: 0,
      mats,
      hl: 0,
    })
  })

  // ---- 5. Exploded targets: separate along the face normal (+Z), spread radially a little ----
  const n = parts.length
  const centers = parts.map((p) => {
    const tb = new THREE.Box3().setFromObject(p.node, true)
    return tb.getCenter(new THREE.Vector3())
  })
  const order = parts
    .map((_, i) => i)
    .sort((i, j) => centers[i]!.z - centers[j]!.z || parts[i]!.diag - parts[j]!.diag)
  const step = n > 1 ? Math.min(0.16, 0.85 / (n - 1)) : 0
  order.forEach((partIndex, rank) => {
    const p = parts[partIndex]!
    const c = centers[partIndex]!
    const dz = (rank - (n - 1) / 2) * step
    const r = Math.hypot(c.x, c.y)
    const push = r > 1e-3 ? 0.2 : 0
    const dx = r > 1e-3 ? (c.x / r) * r * push : 0
    const dy = r > 1e-3 ? (c.y / r) * r * push : 0
    const parent = p.node.parent ?? orient
    parent.updateMatrixWorld(true)
    const startWorld = p.node.getWorldPosition(new THREE.Vector3())
    const startLocal = parent.worldToLocal(startWorld.clone())
    const endLocal = parent.worldToLocal(startWorld.clone().add(new THREE.Vector3(dx, dy, dz)))
    p.exploded = p.orig.clone().add(endLocal.sub(startLocal))
    p.delay = n > 1 ? (rank / (n - 1)) * 0.3 : 0
  })

  // ---- 6. Report ----
  let limitation: string | null = null
  let explodable = true
  if (n < 2) {
    explodable = false
    limitation =
      allMeshes.length <= 1
        ? 'This model is a single merged mesh, so its components cannot be separated or highlighted individually. The scroll sequence still moves the camera and rotates the watch, but the exploded view is disabled.'
        : 'The model could not be split into separate parts, so the exploded view is disabled.'
  } else if (n < 4) {
    limitation = `Only ${n} separable parts were found in this model, so the exploded view is limited to those.`
  }

  const report: PreparedModel['report'] = {
    parts: parts.map((p) => p.info),
    materials: [...materialMap.values()],
    explodable,
    limitation,
    meshCount: allMeshes.length,
    triangles: totalTris,
    dims,
    groupedBy,
  }

  rigGroup.position.copy(saved.p)
  rigGroup.quaternion.copy(saved.q)
  rigGroup.scale.copy(saved.s)

  const dispose = () => {
    // Restore original transforms and hierarchy.
    for (const p of parts) p.node.position.copy(p.orig)
    for (const { mesh, parent } of reparented) parent.attach(mesh)
    for (const g of createdGroups) g.removeFromParent()
    for (const m of matClones) m.dispose()
  }

  return {
    parts,
    report,
    fit: { halfW: dims[0] / 2, halfH: dims[1] / 2 },
    dispose,
  }
}

const GOLD = new THREE.Color('#c9a96a')
const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

/** Positions one part between its original and exploded transform and fades its highlight. */
export function updatePart(p: PartRuntime, explode: number, selected: boolean, dt: number) {
  const e = smooth((explode - p.delay) / (1 - 0.3))
  p.node.position.lerpVectors(p.orig, p.exploded, e)

  const target = selected ? 1 : 0
  const next = THREE.MathUtils.damp(p.hl, target, 10, dt)
  if (next === p.hl) return
  p.hl = Math.abs(next - target) < 0.002 ? target : next
  for (const m of p.mats) {
    m.mat.emissive.copy(m.baseColor).lerp(GOLD, p.hl)
    m.mat.emissiveIntensity = THREE.MathUtils.lerp(m.baseIntensity, 0.55, p.hl)
  }
}
