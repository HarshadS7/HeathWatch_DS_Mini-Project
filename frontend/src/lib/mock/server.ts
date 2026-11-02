/**
 * DEV-ONLY mock of the HeatWatch backend.
 *
 * Lets the frontend be built and demoed before the FastAPI + C++ engine exist.
 * It mirrors the real pipeline (replay producer -> circular queue -> consumer ->
 * latest readings / alerts) so the UI exercises the same states. Every response
 * is tagged `engine.mode = "mock"` and every trace `source = "mock"`, and the UI
 * shows that label. Switch to the real backend with VITE_USE_MOCK=false.
 */
import sample from './sample.json'
import fixtures from './fixtures.json'
import { bandFor } from '../bands'
import { haversineKm } from '../format'
import type {
  Alert,
  Dashboard,
  GraphEdge,
  HotComponents,
  Observation,
  Prediction,
  QueueSlot,
  QueueState,
  StationSummary,
  Trace,
  TraceStep,
} from '../types'

interface Sample {
  stations: { id: string; name: string; lat: number; lon: number; gridLat: number; gridLon: number }[]
  dates: string[]
  temps: (number | null)[][]
  normals: (number | null)[][]
}
const S = sample as Sample
const SOURCE = 'IMD Pune · daily gridded Tmax 1.0° (2024 sample)'
const EDGE_KM = 450

/* ------------------------------------------------------------------ state */
const CAP = 24
let threshold = 40
let speed = 4 // days per second
let running = false
let dayIdx = 0 // next day the producer will emit
let pendingDay: { stationIdx: number; dayIdx: number }[] = []
let timer: ReturnType<typeof setInterval> | null = null
let obsId = 1
let rejected = 0
let processed = 0
let accepted = 0
let reqCounter = 100

const q: QueueState = { capacity: CAP, front: 0, rear: 0, count: 0, slots: Array(CAP).fill(null) }
const latest = new Map<string, { dayIdx: number; t: number }>()
const history = new Map<string, Observation[]>()
const alerts: Alert[] = []
let alertId = 1

const edges: GraphEdge[] = (() => {
  const out: GraphEdge[] = []
  S.stations.forEach((a, i) =>
    S.stations.slice(i + 1).forEach((b) => {
      const km = haversineKm(a.lat, a.lon, b.lat, b.lon)
      if (km <= EDGE_KM) out.push({ a: a.id, b: b.id, km: Math.round(km) })
    }),
  )
  return out
})()

function enqueue(slot: QueueSlot): boolean {
  if (q.count === q.capacity) return false
  q.slots[q.rear] = slot
  q.rear = (q.rear + 1) % q.capacity
  q.count++
  return true
}
function dequeue(): QueueSlot | null {
  if (q.count === 0) return null
  const x = q.slots[q.front]
  q.slots[q.front] = null
  q.front = (q.front + 1) % q.capacity
  q.count--
  return x
}

function departure(stationIdx: number, d: number) {
  const t = S.temps[d][stationIdx]
  const n = S.normals[d][stationIdx]
  return t == null || n == null ? null : +(t - n).toFixed(1)
}

function process(slot: QueueSlot) {
  const si = S.stations.findIndex((s) => s.id === slot.stationId)
  const d = Number(slot.id.split(':')[1])
  latest.set(slot.stationId, { dayIdx: d, t: slot.temperatureC })
  const list = history.get(slot.stationId) ?? []
  list.push({ id: obsId++, stationId: slot.stationId, observedAt: S.dates[d], temperatureC: slot.temperatureC, source: SOURCE })
  history.set(slot.stationId, list)
  processed++
  // alert state machine: open -> update -> resolve
  const open = alerts.find((a) => a.stationId === slot.stationId && !a.resolvedAt)
  const date = S.dates[d]
  if (slot.temperatureC >= threshold) {
    if (open) {
      open.updatedAt = date
      open.latestC = slot.temperatureC
      open.peakC = Math.max(open.peakC, slot.temperatureC)
    } else {
      alerts.unshift({
        id: alertId++,
        stationId: slot.stationId,
        stationName: S.stations[si].name,
        openedAt: date,
        updatedAt: date,
        resolvedAt: null,
        thresholdC: threshold,
        peakC: slot.temperatureC,
        latestC: slot.temperatureC,
        acknowledgedAt: null,
      })
    }
  } else if (open) {
    open.resolvedAt = date
    open.updatedAt = date
    open.latestC = slot.temperatureC
  }
}

/** One tick = producer tries to emit one day's readings (with backpressure), consumer drains a batch. */
function tick() {
  // producer
  if (pendingDay.length === 0 && dayIdx < S.dates.length) {
    pendingDay = S.stations.map((_, i) => ({ stationIdx: i, dayIdx })).filter((p) => S.temps[p.dayIdx][p.stationIdx] != null)
    dayIdx++
  }
  while (pendingDay.length) {
    const p = pendingDay[0]
    const ok = enqueue({
      id: `${S.stations[p.stationIdx].id}:${p.dayIdx}`,
      stationId: S.stations[p.stationIdx].id,
      temperatureC: S.temps[p.dayIdx][p.stationIdx] as number,
    })
    if (!ok) break // backpressure: retry the same reading next tick
    accepted++
    pendingDay.shift()
  }
  // consumer processes slightly fewer than one day per tick so the queue visibly fills
  for (let k = 0; k < 12; k++) {
    const x = dequeue()
    if (!x) break
    process(x)
  }
  if (dayIdx >= S.dates.length && pendingDay.length === 0 && q.count === 0) stop()
}

function start() {
  if (timer) return
  running = true
  timer = setInterval(tick, 1000 / speed)
}
function stop() {
  running = false
  if (timer) clearInterval(timer)
  timer = null
}

function reset() {
  stop()
  dayIdx = 0
  pendingDay = []
  q.front = q.rear = q.count = 0
  q.slots.fill(null)
  latest.clear()
  history.clear()
  alerts.length = 0
  rejected = processed = accepted = 0
}

// Warm start: pre-process ~2 months so the first screen is meaningful.
function warm(days: number) {
  for (let i = 0; i < days * 2; i++) tick()
}
warm(60)

const delay = <T,>(v: T, ms = 120) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), ms))

/* ------------------------------------------------------------------ API */
export const mockApi = {
  async dashboard(): Promise<Dashboard> {
    let hottest: Dashboard['hottest'] = null
    let above = 0
    let asOf: string | null = null
    for (const s of S.stations) {
      const l = latest.get(s.id)
      if (!l) continue
      if (!asOf || S.dates[l.dayIdx] > asOf) asOf = S.dates[l.dayIdx]
      if (l.t >= threshold) above++
      if (!hottest || l.t > hottest.temperatureC)
        hottest = { stationId: s.id, name: s.name, temperatureC: l.t, observedAt: S.dates[l.dayIdx] }
    }
    return delay({
      asOf,
      mode: 'replay' as const,
      source: SOURCE,
      thresholdC: threshold,
      stationCount: S.stations.length,
      hottest,
      aboveThreshold: above,
      queue: { capacity: q.capacity, count: q.count, front: q.front, rear: q.rear, accepted, rejected, processed },
      replay: { running, speed, position: dayIdx, total: S.dates.length, session: 'imd-2024-summer' },
      engine: { ok: true, mode: 'mock' as const },
    })
  },

  async stations(): Promise<StationSummary[]> {
    return delay(
      S.stations.map((s, i) => {
        const l = latest.get(s.id)
        const dep = l ? departure(i, l.dayIdx) : null
        return {
          ...s,
          sourceType: 'imd_grid_cell' as const,
          latest: l ? { observedAt: S.dates[l.dayIdx], temperatureC: l.t, departureC: dep, band: bandFor(l.t, dep) } : null,
        }
      }),
    )
  },

  async observations(stationId: string): Promise<Observation[]> {
    return delay(history.get(stationId) ?? [])
  },

  async normals(stationId: string): Promise<{ date: string; normalC: number | null }[]> {
    const i = S.stations.findIndex((s) => s.id === stationId)
    return delay(S.dates.map((d, k) => ({ date: d, normalC: S.normals[k][i] })))
  },

  async alerts(): Promise<Alert[]> {
    return delay(alerts.slice(0, 50))
  },

  async acknowledge(id: number): Promise<Alert | undefined> {
    const a = alerts.find((x) => x.id === id)
    if (a && !a.acknowledgedAt) a.acknowledgedAt = new Date().toISOString()
    return delay(a)
  },

  async prediction(stationId: string): Promise<Prediction> {
    const h = history.get(stationId) ?? []
    if (h.length < 4) return delay({ stationId, available: false, reason: 'Needs 4 consecutive days of history.' })
    const last = h.slice(-4).map((o) => o.temperatureC)
    // placeholder: damped trend. Real model comes from ml/ (linear regression vs persistence).
    const pred = last[3] + 0.35 * (last[3] - last[2]) + 0.15 * (last[2] - last[1])
    const base = h[h.length - 1]
    const next = new Date(base.observedAt + 'T00:00:00Z')
    next.setUTCDate(next.getUTCDate() + 1)
    return delay({
      stationId,
      available: true,
      basedOn: base.observedAt,
      targetDate: next.toISOString().slice(0, 10),
      predictedC: +pred.toFixed(1),
      baselineC: last[3],
      modelVersion: 'mock-trend-0',
    })
  },

  async components(algorithm: 'bfs' | 'dfs' = 'bfs'): Promise<HotComponents> {
    const hot = S.stations.filter((s) => (latest.get(s.id)?.t ?? -99) >= threshold).map((s) => s.id)
    const hotSet = new Set(hot)
    const adj = new Map<string, string[]>()
    for (const e of edges) {
      if (!hotSet.has(e.a) || !hotSet.has(e.b)) continue
      adj.set(e.a, [...(adj.get(e.a) ?? []), e.b])
      adj.set(e.b, [...(adj.get(e.b) ?? []), e.a])
    }
    const seen = new Set<string>()
    const order: string[] = []
    const components: string[][] = []
    for (const s of hot) {
      if (seen.has(s)) continue
      const comp: string[] = []
      const frontier = [s]
      seen.add(s)
      while (frontier.length) {
        const v = algorithm === 'bfs' ? frontier.shift()! : frontier.pop()!
        comp.push(v)
        order.push(v)
        for (const n of adj.get(v) ?? []) if (!seen.has(n)) (seen.add(n), frontier.push(n))
      }
      components.push(comp)
    }
    return delay({ thresholdC: threshold, algorithm, hot, order, components, edges })
  },

  async replay(action: 'start' | 'pause' | 'reset' | 'speed', value?: number) {
    if (action === 'start') start()
    if (action === 'pause') stop()
    if (action === 'reset') reset()
    if (action === 'speed' && value) {
      speed = value
      if (running) (stop(), start())
    }
    return delay({ ok: true }, 40)
  },

  async setThreshold(t: number) {
    threshold = t
    return delay({ ok: true }, 40)
  },

  async historyRange(station: string, from: string, to: string) {
    const rows = (history.get(station) ?? []).filter((o) => o.observedAt >= from && o.observedAt <= to).map((o) => ({ id: String(o.id), date: o.observedAt, temperatureC: o.temperatureC }))
    return delay({ rows, visited: 0, comparisons: 0, height: 0, size: history.get(station)?.length ?? 0, engineTimeMs: 0, source: 'mock' as const })
  },
  async sortReadings(rows: Observation[]) {
    return delay({ rows: [...rows].sort((a, b) => a.temperatureC - b.temperatureC || a.id - b.id), comparisons: 0, engineTimeMs: 0 })
  },
  labTrace: (op: string, payload: unknown) => mockLabTrace(op, payload as Record<string, unknown>),

  /** Current live queue snapshot (for the Lab's "use live data" mode). */
  async queueState(): Promise<QueueState> {
    return delay(q, 40)
  },

  /**
   * Queue demo trace: runs a scripted sequence of enqueue / dequeue operations on a
   * small queue and records one step per pseudo-code line (same contract as the engine).
   */
  async queueDemo(opts: { capacity: number; ops: ('E' | 'D')[] }): Promise<Trace<QueueState>> {
    const cap = opts.capacity
    const st: QueueState = { capacity: cap, front: 0, rear: 0, count: 0, slots: Array(cap).fill(null) }
    const steps: TraceStep<QueueState>[] = []
    const counters = { enqueued: 0, dequeued: 0, rejected: 0 }
    const push = (event: TraceStep['event'], line: number, note: string) =>
      steps.push({
        event,
        line,
        note,
        vars: { front: st.front, rear: st.rear, count: st.count, capacity: cap },
        counters: { ...counters },
        state: structuredClone(st),
      })
    let k = 0
    const src = S.stations
    push({ type: 'init', op: 'enqueue' }, 0, `Empty queue: capacity ${cap}, front = rear = count = 0.`)
    for (const op of opts.ops) {
      if (op === 'E') {
        const s = src[k % src.length]
        const t = S.temps[60 + Math.floor(k / src.length)][k % src.length] ?? 38
        const item: QueueSlot = { id: `r${k}`, stationId: s.id, temperatureC: t }
        k++
        push({ type: 'call', op: 'enqueue', item }, 1, `enqueue(${s.id} ${t.toFixed(1)} °C)`)
        if (st.count === cap) {
          counters.rejected++
          push({ type: 'reject_full', op: 'enqueue', item }, 3, `count == capacity (${cap}) → reading rejected. Nothing is overwritten.`)
          continue
        }
        push({ type: 'check', op: 'enqueue' }, 2, `count ${st.count} < capacity ${cap} → space available.`)
        st.slots[st.rear] = item
        push({ type: 'write', op: 'enqueue', slot: st.rear, item }, 5, `Write reading into slot[${st.rear}] (rear).`)
        const old = st.rear
        st.rear = (st.rear + 1) % cap
        push(
          { type: st.rear < old ? 'wrap' : 'advance_rear', op: 'enqueue', from: old, to: st.rear },
          6,
          st.rear < old ? `rear = (${old} + 1) mod ${cap} = ${st.rear} → wraps around to the start.` : `rear = (${old} + 1) mod ${cap} = ${st.rear}.`,
        )
        st.count++
        counters.enqueued++
        push({ type: 'count', op: 'enqueue' }, 7, `count = ${st.count}.`)
      } else {
        push({ type: 'call', op: 'dequeue' }, 1, 'dequeue()')
        if (st.count === 0) {
          push({ type: 'reject_empty', op: 'dequeue' }, 2, 'count == 0 → queue empty, nothing to remove.')
          continue
        }
        const item = st.slots[st.front]!
        push({ type: 'read', op: 'dequeue', slot: st.front, item }, 3, `Read slot[${st.front}] (front): ${item.stationId} ${item.temperatureC.toFixed(1)} °C.`)
        st.slots[st.front] = null
        push({ type: 'clear', op: 'dequeue', slot: st.front, item }, 4, `Clear slot[${st.front}].`)
        const old = st.front
        st.front = (st.front + 1) % cap
        push(
          { type: st.front < old ? 'wrap' : 'advance_front', op: 'dequeue', from: old, to: st.front, item },
          5,
          st.front < old ? `front = (${old} + 1) mod ${cap} = ${st.front} → wraps around.` : `front = (${old} + 1) mod ${cap} = ${st.front}.`,
        )
        st.count--
        counters.dequeued++
        push({ type: 'count', op: 'dequeue', item }, 6, `count = ${st.count}. Reading handed to the consumer.`)
      }
    }
    return delay({
      requestId: `mock-${reqCounter++}`,
      structure: 'queue' as const,
      op: 'scenario',
      engineTimeMs: 0,
      truncated: false,
      source: 'mock' as const,
      steps,
    })
  },
}

const FIX = fixtures as unknown as Record<string, Trace>

/** Without the WASM build, Lab operations replay traces recorded from the native C++ engine (default inputs). */
export async function mockLabTrace(op: string, payload: Record<string, unknown>): Promise<Trace> {
  const key = op === 'bst.demo' ? `${op}:${payload.order}` : op === 'graph.components' ? `${op}:${payload.algorithm}` : op
  const t = FIX[key]
  if (!t) throw new Error(`No recorded trace for ${key}; build the WASM engine (engine/build.sh).`)
  return delay(t, 60)
}
export const fixtureMeta = (fixtures as unknown as { _meta: { hashKey: string; hot: string[] } })._meta
