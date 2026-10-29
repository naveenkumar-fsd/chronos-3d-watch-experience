import { useSyncExternalStore } from 'react'

/** Values driven by GSAP ScrollTrigger and read every frame by the 3D scene. */
export interface Rig {
  /** Camera distance multiplier (1 = whole watch in frame). */
  dist: number
  /** Horizontal shift of the watch as a fraction of half the screen width. */
  x: number
  rotY: number
  rotX: number
  /** 0 = assembled, 1 = fully exploded. */
  explode: number
  /** 0..1 opacity of the floating annotations. */
  labels: number
}

export const rig: Rig = { dist: 1, x: 0.3, rotY: 0.55, rotX: 0.05, explode: 0, labels: 0 }

/** Filled in by the model once it has been measured. Read non-reactively in frames. */
export const fit = { halfW: 1, halfH: 1 }

export type PartKind =
  | 'case'
  | 'bezel'
  | 'crystal'
  | 'dial'
  | 'hands'
  | 'crown'
  | 'strap'
  | 'lugs'
  | 'pusher'
  | 'markers'
  | 'caseback'
  | 'buckle'
  | 'movement'
  | 'unknown'

export interface PartInfo {
  id: string
  index: number
  /** Raw name from the GLB (node or mesh). */
  rawName: string
  label: string
  kind: PartKind
  /** The keyword that led to the classification, or null when unidentified. */
  matched: string | null
  meshCount: number
  triangles: number
  materials: string[]
  metalness: number | null
  roughness: number | null
  colorHex: string | null
  /** Bounding box size in normalised scene units. */
  size: [number, number, number]
  /** Share of the watch's longest dimension, 0..1. */
  extent: number
}

export interface MaterialInfo {
  name: string
  colorHex: string
  metalness: number | null
  roughness: number | null
  usedBy: number
}

export interface ModelReport {
  status: 'loading' | 'ready' | 'error' | 'off'
  error: string | null
  parts: PartInfo[]
  materials: MaterialInfo[]
  explodable: boolean
  limitation: string | null
  meshCount: number
  triangles: number
  dims: [number, number, number]
  groupedBy: 'hierarchy' | 'meshes' | 'material' | 'none'
}

const emptyReport: ModelReport = {
  status: 'loading',
  error: null,
  parts: [],
  materials: [],
  explodable: false,
  limitation: null,
  meshCount: 0,
  triangles: 0,
  dims: [0, 0, 0],
  groupedBy: 'none',
}

let report: ModelReport = emptyReport
let selectedId: string | null = null
const reportListeners = new Set<() => void>()
const selectionListeners = new Set<() => void>()

export function setReport(next: Partial<ModelReport>) {
  report = { ...report, ...next }
  reportListeners.forEach((l) => l())
}

export function resetReport() {
  report = emptyReport
  selectedId = null
  reportListeners.forEach((l) => l())
  selectionListeners.forEach((l) => l())
}

export function getSelectedId() {
  return selectedId
}

export function setSelectedId(id: string | null) {
  if (id === selectedId) return
  selectedId = id
  selectionListeners.forEach((l) => l())
}

export function useReport(): ModelReport {
  return useSyncExternalStore(
    (cb) => {
      reportListeners.add(cb)
      return () => reportListeners.delete(cb)
    },
    () => report,
  )
}

export function useSelectedId(): string | null {
  return useSyncExternalStore(
    (cb) => {
      selectionListeners.add(cb)
      return () => selectionListeners.delete(cb)
    },
    () => selectedId,
  )
}
