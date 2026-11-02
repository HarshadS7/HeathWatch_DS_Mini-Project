import type { Trace } from '../../../lib/types'

export interface GraphContext {
  stations: { id: string; name: string; lat: number; lon: number }[]
  edges: { a: string; b: string; km: number }[]
  hot: string[]
}

export interface SceneProps {
  trace: Trace
  step: number
  reduced: boolean
  graph?: GraphContext
}

/** Collect event payload values of a given type from steps[0..step] (scenes derive history from the trace prefix). */
export function seenUpTo<T = string>(trace: Trace, step: number, type: string, field = 'node'): T[] {
  const out: T[] = []
  for (let i = 0; i <= step; i++) if (trace.steps[i].event.type === type) out.push(trace.steps[i].event[field] as T)
  return out
}
