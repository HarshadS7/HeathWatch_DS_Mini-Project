import { mockApi } from './mock/server'
import type { Alert, Dashboard, HotComponents, Observation, Prediction, QueueState, StationSummary, Trace } from './types'

/** VITE_USE_MOCK=false switches every call to the FastAPI backend at /api. */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch('/api' + path, { headers: { 'Content-Type': 'application/json' }, ...init })
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      msg = body.detail ?? body.error ?? msg
    } catch {
      /* not JSON */
    }
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}
const post = <T,>(p: string, body?: unknown) => http<T>(p, { method: 'POST', body: JSON.stringify(body ?? {}) })

export const api = USE_MOCK
  ? mockApi
  : {
      dashboard: () => http<Dashboard>('/dashboard'),
      stations: () => http<StationSummary[]>('/stations'),
      observations: (id: string) => http<Observation[]>(`/stations/${id}/observations?limit=400`),
      normals: (id: string) => http<{ date: string; normalC: number | null }[]>(`/stations/${id}/normals`),
      alerts: () => http<Alert[]>('/alerts'),
      acknowledge: (id: number) => http<Alert>(`/alerts/${id}`, { method: 'PATCH', body: JSON.stringify({ acknowledged: true }) }),
      prediction: (id: string) => http<Prediction>(`/stations/${id}/prediction`),
      components: (algorithm: 'bfs' | 'dfs' = 'bfs') => http<HotComponents>(`/graph/components?algorithm=${algorithm}`),
      replay: (action: 'start' | 'pause' | 'reset' | 'speed', value?: number) =>
        action === 'speed' ? http('/settings', { method: 'PATCH', body: JSON.stringify({ replay_speed: value }) }) : post(`/replay/${action}`),
      setThreshold: (t: number) => http('/settings', { method: 'PATCH', body: JSON.stringify({ threshold_c: t }) }),
      queueState: () => http<QueueState>('/engine/state?structure=queue'),
      queueDemo: (opts: { capacity: number; ops: ('E' | 'D')[] }) => post<Trace<QueueState>>('/engine/demo/queue', opts),
    }
