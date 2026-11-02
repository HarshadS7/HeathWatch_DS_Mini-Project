/**
 * In-browser service layer (replaces the FastAPI backend).
 * Pipeline: replay producer -> engine circular queue (WASM) -> consumer (engine list + BST)
 *           -> IndexedDB persistence -> alerts -> UI.
 * On page load it restores IndexedDB and asks the engine to rebuild its indexes.
 */
import sample from './mock/sample.json'
import { bandFor } from './bands'
import { call } from '../engine/client'
import { clearAll, getAll, getMeta, putMany } from './idb'
import type { Alert, Dashboard, HotComponents, Observation, Prediction, QueueSlot, QueueState, StationSummary, Trace, TraceStep } from './types'

interface Sample {
  stations: { id: string; name: string; lat: number; lon: number; gridLat: number; gridLon: number }[]
  dates: string[]
  temps: (number | null)[][]
  normals: (number | null)[][]
}
const S = sample as Sample
const SOURCE = 'IMD Pune · daily gridded Tmax 1.0° (2024 sample)'
const QUEUE_CAP = 24
const PER_TICK = 12
const dateInt = (iso: string) => Number(iso.replaceAll('-', ''))
const obsId = (day: number, si: number) => day * 100 + si + 1 // deterministic -> idempotent re-processing

interface Meta {
  dayIdx: number
  threshold: number
  speed: number
}
let meta: Meta = { dayIdx: 0, threshold: 40, speed: 4 }
let running = false
let timer: ReturnType<typeof setInterval> | null = null
let pending: Observation[] = []
const obs = new Map<string, Observation[]>()
const seen = new Set<number>()
let alerts: Alert[] = []
let stats = { capacity: QUEUE_CAP, count: 0, front: 0, rear: 0, accepted: 0, rejected: 0, processed: 0 }
let edges: HotComponents['edges'] = []

/* ------------------------------------------------------------- boot */
async function initEngine() {
  const r = await call<{ edges: HotComponents['edges'] }>('init', {
    stations: S.stations.map(({ id, name, lat, lon }) => ({ id, name, lat, lon })),
    queueCapacity: QUEUE_CAP,
    historyLimit: 30,
    edgeKm: 450,
  })
  edges = r.result.edges
  const rows = [...obs.values()].flat().sort((a, b) => (a.observedAt < b.observedAt ? -1 : a.observedAt > b.observedAt ? 1 : a.id - b.id))
  if (rows.length)
    await call('rebuild', { obs: rows.map((o) => ({ id: o.id, station: o.stationId, date: dateInt(o.observedAt), t: o.temperatureC })) })
}

export const ready: Promise<void> = (async () => {
  meta = (await getMeta<Meta>('meta')) ?? meta
  for (const o of await getAll<Observation>('obs')) {
    seen.add(o.id)
    const l = obs.get(o.stationId) ?? []
    l.push(o)
    obs.set(o.stationId, l)
  }
  obs.forEach((l) => l.sort((a, b) => (a.observedAt < b.observedAt ? -1 : 1)))
  alerts = (await getAll<Alert>('alerts')).sort((a, b) => b.id - a.id)
  await initEngine()
  // readings emitted before the reload but never processed are re-queued in order
  for (let d = 0; d < meta.dayIdx; d++)
    S.stations.forEach((s, si) => {
      const t = S.temps[d][si]
      if (t != null && !seen.has(obsId(d, si))) pending.push({ id: obsId(d, si), stationId: s.id, observedAt: S.dates[d], temperatureC: t, source: SOURCE })
    })
  if (!seen.size && meta.dayIdx === 0) for (let i = 0; i < 120; i++) await tick() // first visit: warm start (~2 months)
})()

/* ------------------------------------------------------------- pipeline */
async function tick() {
  if (!pending.length && meta.dayIdx < S.dates.length) {
    const d = meta.dayIdx++
    S.stations.forEach((s, si) => {
      const t = S.temps[d][si]
      if (t != null) pending.push({ id: obsId(d, si), stationId: s.id, observedAt: S.dates[d], temperatureC: t, source: SOURCE })
    })
  }
  // producer with backpressure: stop at the first rejection and retry that reading next tick
  while (pending.length) {
    const o = pending[0]
    const r = await call<{ accepted: boolean; queue: typeof stats }>('ingest', {
      obs: { id: o.id, station: o.stationId, date: dateInt(o.observedAt), t: o.temperatureC },
    })
    stats = r.result.queue
    if (!r.result.accepted) break
    pending.shift()
  }
  const r = await call<{ processed: { id: number; station: string; date: number; t: number }[]; queue: typeof stats }>('process', { max: PER_TICK })
  stats = r.result.queue
  const fresh: Observation[] = []
  const touched = new Map<number, Alert>()
  for (const p of r.result.processed) {
    if (seen.has(p.id)) continue // idempotent
    seen.add(p.id)
    const iso = `${String(p.date).slice(0, 4)}-${String(p.date).slice(4, 6)}-${String(p.date).slice(6)}`
    const o = { id: p.id, stationId: p.station, observedAt: iso, temperatureC: p.t, source: SOURCE }
    fresh.push(o)
    const l = obs.get(o.stationId) ?? []
    l.push(o)
    obs.set(o.stationId, l)
    const a = evaluateAlert(o)
    if (a) touched.set(a.id, a)
  }
  await Promise.all([putMany('obs', fresh), putMany('alerts', [...touched.values()]), putMany('meta', [meta], 'meta')])
  if (meta.dayIdx >= S.dates.length && !pending.length && stats.count === 0) stop()
}

// open -> update while above -> resolve when below; history retained
function evaluateAlert(o: Observation): Alert | null {
  const open = alerts.find((a) => a.stationId === o.stationId && !a.resolvedAt)
  if (o.temperatureC >= meta.threshold) {
    if (open) {
      Object.assign(open, { updatedAt: o.observedAt, latestC: o.temperatureC, peakC: Math.max(open.peakC, o.temperatureC) })
      return open
    }
    const a: Alert = {
      id: (alerts[0]?.id ?? 0) + 1,
      stationId: o.stationId,
      stationName: S.stations.find((s) => s.id === o.stationId)!.name,
      openedAt: o.observedAt,
      updatedAt: o.observedAt,
      resolvedAt: null,
      thresholdC: meta.threshold,
      peakC: o.temperatureC,
      latestC: o.temperatureC,
      acknowledgedAt: null,
    }
    alerts.unshift(a)
    return a
  }
  if (open) {
    Object.assign(open, { resolvedAt: o.observedAt, updatedAt: o.observedAt, latestC: o.temperatureC })
    return open
  }
  return null
}

let ticking = false
function start() {
  if (timer) return
  running = true
  timer = setInterval(async () => {
    if (ticking) return
    ticking = true
    try {
      await tick()
    } finally {
      ticking = false
    }
  }, 1000 / meta.speed)
}
function stop() {
  running = false
  if (timer) clearInterval(timer)
  timer = null
}

/* ------------------------------------------------------------- helpers */
const latestOf = (id: string) => obs.get(id)?.at(-1)
function departure(o: Observation) {
  const d = S.dates.indexOf(o.observedAt)
  const n = d >= 0 ? S.normals[d][S.stations.findIndex((s) => s.id === o.stationId)] : null
  return n == null ? null : +(o.temperatureC - n).toFixed(1)
}
const toTrace = <St,>(structure: Trace['structure'], op: string, r: { id: string; engineTimeMs?: number; trace?: { truncated: boolean; steps: unknown[] }; result: unknown }): Trace<St> => ({
  requestId: r.id,
  structure,
  op,
  engineTimeMs: r.engineTimeMs ?? 0,
  truncated: r.trace?.truncated ?? false,
  source: 'engine',
  steps: (r.trace?.steps ?? []) as TraceStep<St>[],
  result: r.result,
})

let model: { version: string; features: string[]; mean: number[]; std: number[]; coef: number[]; intercept: number } | null | undefined
async function loadModel() {
  if (model !== undefined) return model
  try {
    model = await (await fetch('/model.json')).json()
  } catch {
    model = null
  }
  return model
}

/* ------------------------------------------------------------- API (same shape as the mock) */
export const engineApi = {
  async dashboard(): Promise<Dashboard> {
    await ready
    let hottest: Dashboard['hottest'] = null
    let above = 0
    let asOf: string | null = null
    for (const s of S.stations) {
      const l = latestOf(s.id)
      if (!l) continue
      if (!asOf || l.observedAt > asOf) asOf = l.observedAt
      if (l.temperatureC >= meta.threshold) above++
      if (!hottest || l.temperatureC > hottest.temperatureC) hottest = { stationId: s.id, name: s.name, temperatureC: l.temperatureC, observedAt: l.observedAt }
    }
    return {
      asOf,
      mode: 'replay',
      source: SOURCE,
      thresholdC: meta.threshold,
      stationCount: S.stations.length,
      hottest,
      aboveThreshold: above,
      queue: stats,
      replay: { running, speed: meta.speed, position: meta.dayIdx, total: S.dates.length, session: 'imd-2024-summer' },
      engine: { ok: true, mode: 'engine' },
    }
  },
  async stations(): Promise<StationSummary[]> {
    await ready
    return S.stations.map((s) => {
      const l = latestOf(s.id)
      const dep = l ? departure(l) : null
      return { ...s, sourceType: 'imd_grid_cell' as const, latest: l ? { observedAt: l.observedAt, temperatureC: l.temperatureC, departureC: dep, band: bandFor(l.temperatureC, dep) } : null }
    })
  },
  async observations(id: string) {
    await ready
    return [...(obs.get(id) ?? [])]
  },
  async normals(id: string) {
    const i = S.stations.findIndex((s) => s.id === id)
    return S.dates.map((d, k) => ({ date: d, normalC: S.normals[k][i] }))
  },
  async alerts() {
    await ready
    return alerts.slice(0, 50).map((a) => ({ ...a }))
  },
  async acknowledge(id: number) {
    const a = alerts.find((x) => x.id === id)
    if (a && !a.acknowledgedAt) {
      a.acknowledgedAt = new Date().toISOString()
      await putMany('alerts', [a])
    }
    return a
  },
  async prediction(id: string): Promise<Prediction> {
    await ready
    const h = obs.get(id) ?? []
    const m = await loadModel()
    if (!m) return { stationId: id, available: false, reason: 'Model file not found (run ml/train.py).' }
    const last = h.slice(-7)
    const consecutive = last.length === 7 && last.every((o, i) => i === 0 || (Date.parse(o.observedAt) - Date.parse(last[i - 1].observedAt)) / 864e5 === 1)
    if (!consecutive) return { stationId: id, available: false, reason: 'Needs 7 consecutive days of history.' }
    const t = last.map((o) => o.temperatureC).reverse() // t[0] = latest
    const base = last[6].observedAt
    const target = new Date(Date.parse(base) + 864e5).toISOString().slice(0, 10)
    const doy = (Date.parse(target) - Date.parse(target.slice(0, 4) + '-01-01')) / 864e5 + 1
    const f: Record<string, number> = {
      t0: t[0],
      t1: t[1],
      t2: t[2],
      t3: t[3],
      mean7: t.reduce((a, b) => a + b, 0) / 7,
      doy_sin: Math.sin((2 * Math.PI * doy) / 365.25),
      doy_cos: Math.cos((2 * Math.PI * doy) / 365.25),
    }
    const y = m.features.reduce((acc, k, i) => acc + m.coef[i] * ((f[k] - m.mean[i]) / m.std[i]), m.intercept)
    return { stationId: id, available: true, basedOn: base, targetDate: target, predictedC: +y.toFixed(1), baselineC: t[0], modelVersion: m.version }
  },
  async components(algorithm: 'bfs' | 'dfs' = 'bfs'): Promise<HotComponents> {
    await ready
    const hot = S.stations.filter((s) => (latestOf(s.id)?.temperatureC ?? -99) >= meta.threshold).map((s) => s.id)
    const r = await call<{ order: string[]; components: string[][] }>('graph.components', { hot, algorithm })
    return { thresholdC: meta.threshold, algorithm, hot, order: r.result.order, components: r.result.components, edges }
  },
  async replay(action: 'start' | 'pause' | 'reset' | 'speed', value?: number) {
    await ready
    if (action === 'start') start()
    if (action === 'pause') stop()
    if (action === 'speed' && value) ((meta.speed = value), running && (stop(), start()))
    if (action === 'reset') {
      stop()
      await clearAll()
      obs.clear()
      seen.clear()
      alerts = []
      pending = []
      meta = { ...meta, dayIdx: 0 }
      await initEngine()
      stats = { ...stats, count: 0, front: 0, rear: 0, accepted: 0, rejected: 0, processed: 0 }
    }
    await putMany('meta', [meta], 'meta')
    return { ok: true }
  },
  async setThreshold(t: number) {
    meta.threshold = t
    await putMany('meta', [meta], 'meta')
    return { ok: true }
  },
  async queueState(): Promise<QueueState> {
    await ready
    const r = await call<{ state: QueueState }>('queue.state')
    return r.result.state
  },
  async queueDemo(opts: { capacity: number; ops: ('E' | 'D')[] }): Promise<Trace<QueueState>> {
    // real readings from the sample (mid-May 2024) feed the demo queue
    const items: QueueSlot[] = []
    for (let k = 0; items.length < opts.ops.length; k++) {
      const d = 70 + Math.floor(k / S.stations.length)
      const si = k % S.stations.length
      const t = S.temps[d][si]
      if (t != null) items.push({ id: `d${d}s${si}`, stationId: S.stations[si].id, temperatureC: t })
    }
    const r = await call('queue.demo', { ...opts, items }, true)
    return toTrace<QueueState>('queue', 'scenario', r)
  },
}
