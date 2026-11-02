// Main-thread client for the engine worker: request ids, one promise per request, timeouts.
interface Pending {
  resolve: (v: EngineResponse) => void
  reject: (e: Error) => void
  timer: ReturnType<typeof setTimeout>
}
export interface EngineResponse<R = unknown> {
  id: string
  ok: boolean
  engineTimeMs?: number
  result: R
  trace?: { truncated: boolean; steps: unknown[] }
  error?: string
}

let worker: Worker | null = null
let seq = 0
const pending = new Map<string, Pending>()
let onCrash: (() => void) | null = null

function spawn() {
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (e: MessageEvent<string>) => {
    const res = JSON.parse(e.data) as EngineResponse
    const p = pending.get(res.id)
    if (!p) return
    clearTimeout(p.timer)
    pending.delete(res.id)
    res.ok ? p.resolve(res) : p.reject(new Error(res.error ?? 'engine error'))
  }
  worker.onerror = () => restart()
}

function restart() {
  worker?.terminate()
  pending.forEach((p) => (clearTimeout(p.timer), p.reject(new Error('engine restarted'))))
  pending.clear()
  spawn()
  onCrash?.()
}

export function onEngineRestart(cb: () => void) {
  onCrash = cb
}

export function call<R>(op: string, payload: unknown = {}, trace = false, timeoutMs = 8000): Promise<EngineResponse<R>> {
  if (!worker) spawn()
  const id = `r${++seq}`
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`engine timeout on ${op}`))
      restart()
    }, timeoutMs)
    pending.set(id, { resolve: resolve as Pending['resolve'], reject, timer })
    worker!.postMessage(JSON.stringify({ id, op, payload, trace }))
  })
}
