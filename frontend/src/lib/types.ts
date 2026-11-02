export type Band = 'normal' | 'watch' | 'heat' | 'severe'

export interface Station {
  id: string
  name: string
  lat: number
  lon: number
  gridLat: number
  gridLon: number
  sourceType: 'imd_grid_cell'
}

export interface Reading {
  observedAt: string // ISO date (daily data)
  temperatureC: number
  departureC: number | null
  band: Band
}

export interface StationSummary extends Station {
  latest: Reading | null
}

export interface QueueStats {
  capacity: number
  count: number
  front: number
  rear: number
  accepted: number
  rejected: number
  processed: number
}

export interface ReplayState {
  running: boolean
  speed: number // simulated days per second
  position: number
  total: number
  session: string
}

export interface Dashboard {
  asOf: string | null
  mode: 'replay'
  source: string
  thresholdC: number
  stationCount: number
  hottest: { stationId: string; name: string; temperatureC: number; observedAt: string } | null
  aboveThreshold: number
  queue: QueueStats
  replay: ReplayState
  engine: { ok: boolean; mode: 'mock' | 'engine' }
}

export interface Observation {
  id: number
  stationId: string
  observedAt: string
  temperatureC: number
  source: string
}

export interface Alert {
  id: number
  stationId: string
  stationName: string
  openedAt: string
  updatedAt: string
  resolvedAt: string | null
  thresholdC: number
  peakC: number
  latestC: number
  acknowledgedAt: string | null
}

export interface GraphEdge {
  a: string
  b: string
  km: number
}

export interface HotComponents {
  thresholdC: number
  algorithm: 'bfs' | 'dfs'
  hot: string[]
  order: string[]
  components: string[][]
  edges: GraphEdge[]
}

export interface Prediction {
  stationId: string
  available: boolean
  reason?: string
  basedOn?: string
  targetDate?: string
  predictedC?: number
  baselineC?: number
  modelVersion?: string
}

/* ---------- engine traces (contract shared with the C++ engine) ---------- */

export interface TraceEvent {
  type: string
  [k: string]: unknown
}

export interface TraceStep<S = unknown> {
  event: TraceEvent
  line: number
  note: string
  vars: Record<string, string | number | null>
  counters: Record<string, number>
  state: S
}

export interface Trace<S = unknown> {
  requestId: string
  structure: StructureKey
  op: string
  engineTimeMs: number
  truncated: boolean
  source: 'engine' | 'mock'
  steps: TraceStep<S>[]
  result?: unknown
}

export type StructureKey = 'queue' | 'list' | 'bst' | 'hash' | 'graph' | 'sort' | 'stack'

export interface QueueSlot {
  id: string
  stationId: string
  temperatureC: number
}
export interface QueueState {
  capacity: number
  front: number
  rear: number
  count: number
  slots: (QueueSlot | null)[]
}
