import type { PartKind } from './store'

/**
 * Parts are identified ONLY from the names found inside the GLB (node, mesh and
 * material names). Descriptions explain the role of that visible component in
 * general terms. Nothing here claims to describe an internal mechanism.
 */

interface Rule {
  kind: PartKind
  keywords: string[]
}

// Order matters: more specific rules first.
const RULES: Rule[] = [
  { kind: 'caseback', keywords: ['caseback', 'case_back', 'case back', 'back_cover', 'backplate', 'back plate'] },
  { kind: 'crystal', keywords: ['crystal', 'sapphire', 'glass', 'lens'] },
  { kind: 'bezel', keywords: ['bezel', 'bezel_ring', 'insert'] },
  { kind: 'crown', keywords: ['crown', 'winder'] },
  { kind: 'pusher', keywords: ['pusher', 'button', 'chrono_btn'] },
  { kind: 'hands', keywords: ['hand', 'needle', 'pointer', 'seconds', 'minute', 'hour'] },
  { kind: 'markers', keywords: ['marker', 'index', 'indices', 'lume', 'numeral'] },
  { kind: 'dial', keywords: ['dial', 'face', 'subdial'] },
  { kind: 'buckle', keywords: ['buckle', 'clasp', 'tang', 'keeper', 'loop'] },
  { kind: 'lugs', keywords: ['lug', 'springbar', 'spring_bar'] },
  { kind: 'strap', keywords: ['strap', 'band', 'bracelet', 'link', 'rubber', 'leather', 'nato'] },
  { kind: 'movement', keywords: ['movement', 'caliber', 'calibre', 'rotor', 'gear', 'wheel'] },
  { kind: 'case', keywords: ['case', 'body', 'housing', 'shell', 'mid'] },
]

export interface Classification {
  kind: PartKind
  matched: string | null
}

export function classify(...names: string[]): Classification {
  const hay = names.join(' ').toLowerCase().replace(/[-.]/g, '_')
  for (const rule of RULES) {
    for (const k of rule.keywords) {
      if (hay.includes(k)) return { kind: rule.kind, matched: k }
    }
  }
  return { kind: 'unknown', matched: null }
}

export const KIND_TITLE: Record<PartKind, string> = {
  case: 'Case',
  bezel: 'Bezel',
  crystal: 'Crystal',
  dial: 'Dial',
  hands: 'Hands',
  crown: 'Crown',
  strap: 'Strap',
  lugs: 'Lugs',
  pusher: 'Pusher',
  markers: 'Hour markers',
  caseback: 'Case back',
  buckle: 'Buckle',
  movement: 'Movement component',
  unknown: 'Unidentified component',
}

export const KIND_TEXT: Record<PartKind, string> = {
  case: 'The housing that carries every other visible part and sets the watch’s silhouette. Its outer geometry defines the proportions you see from the front and the side.',
  bezel: 'The ring that frames the crystal. On a dive watch the bezel is typically a timing ring; this model shows its outer geometry only, not how it turns.',
  crystal: 'The transparent cover over the dial. Modelled as its own mesh, it can be lifted away to show what it protects.',
  dial: 'The face of the watch and the surface everything on the front is read against.',
  hands: 'The pointers that indicate time across the dial. They sit just above the dial surface.',
  crown: 'The winding and setting control on the side of the case, shown here as external geometry.',
  strap: 'The part that holds the watch on the wrist. Its geometry shows the shape and thickness of the band.',
  lugs: 'The projections where the strap attaches to the case.',
  pusher: 'An external button on the case, shown as geometry only.',
  markers: 'The hour markers applied to or printed on the dial.',
  caseback: 'The closing plate on the underside of the case, the surface that rests against the wrist.',
  buckle: 'The fastening hardware at the end of the strap.',
  movement: 'A component the model labels as part of the movement. Only its visible geometry is shown here.',
  unknown: 'This component’s role cannot be identified from the file; its name does not describe it. The measurements below come directly from the model.',
}
