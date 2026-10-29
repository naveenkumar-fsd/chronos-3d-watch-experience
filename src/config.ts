// Central settings you can tweak without touching the rest of the code.

export const MODEL_URL = '/models/dive-watch.glb'

export const MODEL_CONFIG = {
  /** The watch is scaled so its longest side equals this many scene units. */
  targetSize: 2,

  /**
   * The code guesses orientation from the bounding box: the thinnest side becomes
   * the face normal (towards the camera), the longest side becomes "up".
   * A bounding box cannot tell the front of a watch from the back, so if you see
   * the case back instead of the dial, set this to true.
   */
  flipFace: false,

  /** Extra rotation in degrees (x, y, z) applied after auto-orientation. */
  extraRotationDeg: [0, 0, 0] as [number, number, number],

  /** Try to split the model into at least this many parts for the exploded view. */
  minParts: 4,
  /** Above this many parts, parts are regrouped by material to keep the view readable. */
  maxParts: 24,
}

export const COLORS = {
  gold: '#c9a96a',
}
