import { useEffect } from 'react'
import { create } from 'zustand'
import type { Trace } from '../../lib/types'

/**
 * Deterministic trace player. The single source of truth is `step`; every panel
 * (3D scene, pseudo-code, variables, counters, narration) is derived from
 * trace.steps[step]. Seeking backwards is just rendering an earlier snapshot.
 */
interface PlayerState {
  trace: Trace | null
  step: number
  playing: boolean
  speed: number // 0.5 .. 4
  load: (t: Trace, startAt?: number) => void
  seek: (s: number) => void
  next: () => void
  prev: () => void
  play: () => void
  pause: () => void
  toggle: () => void
  setSpeed: (s: number) => void
}

export const usePlayer = create<PlayerState>((set, get) => ({
  trace: null,
  step: 0,
  playing: false,
  speed: 1,
  load: (trace, startAt = 0) => set({ trace, step: Math.min(startAt, trace.steps.length - 1), playing: false }),
  seek: (s) => {
    const t = get().trace
    if (!t) return
    set({ step: Math.max(0, Math.min(t.steps.length - 1, s)) })
  },
  next: () => get().seek(get().step + 1),
  prev: () => get().seek(get().step - 1),
  play: () => {
    const t = get().trace
    if (!t) return
    if (get().step >= t.steps.length - 1) set({ step: 0 })
    set({ playing: true })
  },
  pause: () => set({ playing: false }),
  toggle: () => (get().playing ? get().pause() : get().play()),
  setSpeed: (speed) => set({ speed }),
}))

/** Drives autoplay with setTimeout; stops at the last step. */
export function usePlaybackClock() {
  const { playing, step, speed, trace } = usePlayer()
  useEffect(() => {
    if (!playing || !trace) return
    if (step >= trace.steps.length - 1) {
      usePlayer.setState({ playing: false })
      return
    }
    const id = setTimeout(() => usePlayer.getState().next(), 950 / speed)
    return () => clearTimeout(id)
  }, [playing, step, speed, trace])
}

/** Space / ← → / Home / End / + − keyboard control (ignored while typing). */
export function usePlayerKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      const p = usePlayer.getState()
      if (!p.trace) return
      if (e.key === ' ') (e.preventDefault(), p.toggle())
      else if (e.key === 'ArrowRight') (e.preventDefault(), p.pause(), p.next())
      else if (e.key === 'ArrowLeft') (e.preventDefault(), p.pause(), p.prev())
      else if (e.key === 'Home') (p.pause(), p.seek(0))
      else if (e.key === 'End') (p.pause(), p.seek(p.trace.steps.length - 1))
      else if (e.key === '+' || e.key === '=') p.setSpeed(Math.min(4, p.speed * 2))
      else if (e.key === '-') p.setSpeed(Math.max(0.25, p.speed / 2))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

export function useCurrentStep<S = unknown>() {
  const trace = usePlayer((s) => s.trace)
  const step = usePlayer((s) => s.step)
  if (!trace || !trace.steps.length) return { trace, step, cur: null, prev: null }
  return {
    trace,
    step,
    cur: trace.steps[step] as Trace<S>['steps'][number],
    prev: (step > 0 ? trace.steps[step - 1] : null) as Trace<S>['steps'][number] | null,
  }
}
