import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { rig, type Rig } from '../lib/store'

gsap.registerPlugin(ScrollTrigger)
ScrollTrigger.config({ ignoreMobileResize: true })

const RIG_START: Rig = { dist: 1, x: 0.3, rotY: 0.55, rotX: 0.05, explode: 0, labels: 0 }

/**
 * One master timeline, scrubbed by the whole page's scroll position.
 * Because every value lives in a single timeline, scrolling up reverses exactly,
 * and jumping to any position (anchor links, fast flicks) always lands on the right state.
 * Timeline "time" is measured in scroll pixels.
 */
export function useScrollChoreography(rootRef: RefObject<HTMLElement | null>, reduced: boolean, enabled: boolean) {
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || !enabled) return

    let tl: gsap.core.Timeline | null = null
    let resizeTimer = 0

    const q = (sel: string) => root.querySelector<HTMLElement>(sel)
    const top = (el: HTMLElement | null) => (el ? el.getBoundingClientRect().top + window.scrollY : 0)

    const build = () => {
      if (tl) {
        tl.scrollTrigger?.kill()
        tl.kill()
        tl = null
      }
      Object.assign(rig, RIG_START)
      // Clear page-level values set by an earlier build (e.g. after a resize or rotation).
      root.style.removeProperty('--cue')
      root.style.removeProperty('--dim')

      const vh = window.innerHeight
      const max = Math.max(1, document.documentElement.scrollHeight - vh)

      const Ar = top(q('#reveal'))
      const Ae = top(q('#anatomy'))
      const Ax = top(q('#explorer'))
      const As = top(q('#specimen'))
      const Ac = top(q('#contact'))
      if (!Ar || !Ae || !Ax || !As || !Ac) return

      const scrub = reduced ? true : 0.8
      tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: document.body, start: 0, end: 'max', scrub, invalidateOnRefresh: false },
      })

      const seg = (vars: Partial<Rig>, from: number, to: number, ease = 'power1.inOut') => {
        const start = Math.min(Math.max(0, from), max)
        const dur = Math.max(1, Math.min(to, max) - start)
        tl!.to(rig, { ...vars, duration: dur, ease }, start)
      }

      // 1. Hero -> approach: camera moves closer, watch turns to centre.
      seg({ dist: 0.74, x: 0, rotY: -0.15, rotX: 0.08 }, 0, Ar)
      // 2. Rotation reveals the profile.
      seg({ dist: 0.58, rotY: -1.05, rotX: 0.38 }, Ar, Ar + 2 * vh)
      // 3. Exploded view: parts separate along the face normal.
      seg({ explode: 1, dist: 0.98, rotY: -0.85, rotX: 0.28 }, Ae + 0.1 * vh, Ae + 1.5 * vh, 'power2.inOut')
      seg({ labels: 1 }, Ae + 1.3 * vh, Ae + 1.8 * vh, 'power1.out')
      seg({ rotY: -0.45 }, Ae + 1.5 * vh, Ae + 3 * vh, 'none')
      // 4. Explorer: annotations fade, watch moves right, parts stay partly separated.
      seg({ labels: 0 }, Ae + 3 * vh, Ae + 3.4 * vh, 'power1.in')
      const exStart = Ae + 3 * vh
      const exEnd = Math.max(exStart + 1, Ax + 0.3 * vh)
      seg({ explode: 0.75, x: 0.52, dist: 1.0, rotY: -0.55, rotX: 0.22 }, exStart, exEnd)
      // 5. Materials: components return to their original positions.
      const spStart = Math.max(exEnd, As - vh)
      seg({ explode: 0, x: -0.3, dist: 0.9, rotY: 0.3, rotX: 0.1 }, spStart, Math.max(spStart + 1, As))
      // 6. Closing: pull back and park the watch to the right of the centred text column,
      //    so it reads as a background visual. Same scale (dist) and angle as before.
      //    Wide screens: x = the text column's right edge / viewport width, which puts the watch
      //    midway between the text and the screen edge. Portrait screens ignore `x` (the model
      //    keeps its centred layout there), so the stage is dimmed instead.
      const clStart = Math.max(As, Ac - vh)
      const clEnd = Math.max(clStart + 1, Ac)
      const portrait = window.innerWidth / window.innerHeight < 0.9 // same threshold as WatchModel
      const textRight = q('.closing__top')?.getBoundingClientRect().right ?? window.innerWidth * 0.72
      const closingX = portrait ? 0 : Math.min(0.72, Math.max(0.45, textRight / window.innerWidth))
      seg({ x: closingX, dist: 1.15, rotY: 0, rotX: 0.02 }, clStart, clEnd)
      if (portrait) {
        tl.fromTo(root, { '--dim': 1 }, { '--dim': 0.3, duration: Math.max(1, Math.min(clEnd, max) - Math.min(clStart, max)), ease: 'power1.inOut' }, Math.min(clStart, max))
      }

      // ---- DOM choreography in the same timeline ----
      const fade = (sel: string, inFrom: number, inTo: number, outFrom?: number, outTo?: number) => {
        const el = q(sel)
        if (!el) return
        tl!.fromTo(el, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: Math.max(1, inTo - inFrom), ease: 'power1.out' }, inFrom)
        if (outFrom !== undefined && outTo !== undefined) {
          tl!.to(el, { autoAlpha: 0, y: -24, duration: Math.max(1, outTo - outFrom), ease: 'power1.in' }, outFrom)
        }
      }
      fade('.cap--a', Ar - 0.2 * vh, Ar + 0.25 * vh, Ar + 0.55 * vh, Ar + 0.8 * vh)
      fade('.cap--b', Ar + 0.8 * vh, Ar + 1.05 * vh, Ar + 1.4 * vh, Ar + 1.65 * vh)
      fade('.cap--c', Ar + 1.5 * vh, Ar + 1.75 * vh)

      // "Drag to explore" hint (inside the 3D stage): visible at the top of the page only.
      // Driven through a CSS variable on the root so it survives the 3D toggle remounting the stage.
      tl.fromTo(root, { '--cue': 1 }, { '--cue': 0, duration: Math.max(1, 0.35 * vh), ease: 'power1.in' }, 0)

      const reticle = q('.reticle')
      if (reticle) tl.fromTo(reticle, { rotation: 0, transformOrigin: '50% 50%' }, { rotation: 140, duration: 2 * vh }, Ar)

      const bar = q('.progress__fill')
      if (bar) tl.fromTo(bar, { scaleY: 0, transformOrigin: '50% 0%' }, { scaleY: 1, duration: max }, 0)

      // Make the timeline exactly as long as the scrollable distance.
      tl.to({}, { duration: 0.0001 }, max)
    }

    build()

    const onResize = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(build, 250)
    }
    window.addEventListener('resize', onResize)

    // Web fonts change text height, which moves section boundaries.
    let cancelled = false
    void document.fonts?.ready.then(() => {
      if (!cancelled) build()
    })

    return () => {
      cancelled = true
      window.removeEventListener('resize', onResize)
      window.clearTimeout(resizeTimer)
      if (tl) {
        tl.scrollTrigger?.kill()
        tl.kill()
      }
      Object.assign(rig, RIG_START)
      root.style.removeProperty('--cue')
      root.style.removeProperty('--dim')
    }
  }, [rootRef, reduced, enabled])
}
