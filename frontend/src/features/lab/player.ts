import { useEffect, useRef, type RefObject } from 'react'
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
  load: (t: Trace, startAt?: number) => void
  seek: (s: number) => void
}

export const usePlayer = create<PlayerState>((set, get) => ({
  trace: null,
  step: 0,
  load: (trace, startAt = 0) => set({ trace, step: Math.max(0, Math.min(startAt, trace.steps.length - 1)) }),
  seek: (s) => {
    const t = get().trace
    if (t) set({ step: Math.max(0, Math.min(t.steps.length - 1, s)) })
  },
}))

/** Lab camera zoom factor (1 = fitted view) and a counter that asks the scene to reset pan/rotation. */
export const useLabView = create<{ zoom: number; resets: number; zoomBy: (f: number) => void; reset: () => void }>((set) => ({
  zoom: 1,
  resets: 0,
  zoomBy: (f) => set((s) => ({ zoom: Math.min(3, Math.max(0.6, s.zoom * f)) })),
  reset: () => set((s) => ({ zoom: 1, resets: s.resets + 1 })),
}))

const step = (d: number) => usePlayer.getState().seek(usePlayer.getState().step + d)

const PX_PER_STEP = 70 // wheel/touch distance that advances one step

/**
 * Scroll-controlled playback, active only while `engaged`:
 * wheel/trackpad/touch down = next step, up = previous step. When not engaged the
 * listener does nothing, so the page scrolls normally.
 */
export function useScrollSteps(ref: RefObject<HTMLElement | null>, engaged: boolean) {
  const acc = useRef(0)
  useEffect(() => {
    const el = ref.current
    if (!el || !engaged) return
    acc.current = 0
    const advance = (dy: number) => {
      acc.current += dy
      while (acc.current >= PX_PER_STEP) (step(1), (acc.current -= PX_PER_STEP))
      while (acc.current <= -PX_PER_STEP) (step(-1), (acc.current += PX_PER_STEP))
    }
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return // ctrl/⌘ + wheel and pinch zoom the scene instead (handled by useStageZoom)
      e.preventDefault()
      advance(e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY)
    }
    let lastY = 0
    const onTouchStart = (e: TouchEvent) => (lastY = e.touches[0].clientY)
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const y = e.touches[0].clientY
      advance((lastY - y) * 1.5)
      lastY = y
    }
    const onKey = (e: KeyboardEvent) => {
      const k: Record<string, () => void> = {
        ArrowDown: () => step(1),
        ArrowRight: () => step(1),
        ArrowUp: () => step(-1),
        ArrowLeft: () => step(-1),
        Home: () => usePlayer.getState().seek(0),
        End: () => usePlayer.getState().seek(Infinity),
        '+': () => useLabView.getState().zoomBy(1.2),
        '=': () => useLabView.getState().zoomBy(1.2),
        '-': () => useLabView.getState().zoomBy(1 / 1.2),
        '0': () => useLabView.getState().reset(),
      }
      if (k[e.key]) (e.preventDefault(), k[e.key]())
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('keydown', onKey)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('keydown', onKey)
    }
  }, [ref, engaged])
}

/** ctrl/⌘ + wheel (and trackpad pinch, which arrives as ctrl + wheel) zooms the stage, engaged or not. */
export function useStageZoom(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      useLabView.getState().zoomBy(Math.exp(-e.deltaY * 0.004))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [ref])
}

export function useCurrentStep<S = unknown>() {
  const trace = usePlayer((s) => s.trace)
  const step = usePlayer((s) => s.step)
  if (!trace || !trace.steps.length) return { trace, step, cur: null }
  return { trace, step, cur: trace.steps[step] as Trace<S>['steps'][number] }
}
