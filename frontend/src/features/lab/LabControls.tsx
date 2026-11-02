import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { Layers, RotateCcw, Square } from 'lucide-react'
import { api } from '../../lib/api'
import type { Observation, StructureKey, Trace } from '../../lib/types'
import { Button, Segmented } from '../../components/ui'
import type { GraphContext } from './scenes/types'

export type Run = (load: () => Promise<Trace>, jumpTo?: (t: Trace) => number) => void
interface P {
  run: Run
  busy: boolean
  setGraph?: (g: GraphContext) => void
}

const dInt = (iso: string) => Number(iso.replaceAll('-', ''))
const lab = (op: string, payload: unknown, s: StructureKey) => () => api.labTrace(op, payload, s)
const chip = 'rounded-lg border border-line px-2.5 py-1 text-[12.5px] hover:border-primary hover:text-primary'
const input = 'h-8 rounded-lg border border-line bg-surface px-2 text-[12.5px]'

function useStationObs(id: string) {
  const stations = useQuery({ queryKey: ['stations'], queryFn: api.stations })
  const obs = useQuery({ queryKey: ['obs', id], queryFn: () => api.observations(id) })
  return { stations: stations.data ?? [], obs: obs.data ?? [] }
}

function StationSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { stations } = useStationObs(value)
  return (
    <select aria-label="Station" className={input} value={value} onChange={(e) => onChange(e.target.value)}>
      {stations.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  )
}

/* ---------------------------------------------------------------- queue */
const PRESETS: { label: string; ops: ('E' | 'D')[] }[] = [
  { label: 'Enqueue & dequeue', ops: ['E', 'E', 'E', 'D', 'E', 'D'] },
  { label: 'Wraparound', ops: ['E', 'E', 'E', 'E', 'E', 'E', 'D', 'D', 'D', 'D', 'E', 'E', 'E', 'E'] },
  { label: 'Fill & overflow', ops: ['E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'D', 'E'] },
]
const lastCall = (t: Trace) => Math.max(0, t.steps.map((s) => s.event.type).lastIndexOf('call'))

export function QueueControls({ run, busy }: P) {
  const [cap, setCap] = useState(8)
  const [ops, setOps] = useState(PRESETS[0].ops)
  const go = (o: typeof ops, c = cap, jump = false) => (setOps(o), run(() => api.queueDemo({ capacity: c, ops: o }) as Promise<Trace>, jump ? lastCall : undefined))
  useEffect(() => { go(ops) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" disabled={busy} onClick={() => go([...ops, 'E'], cap, true)}>
          <Square size={13} /> Enqueue reading
        </Button>
        <Button size="sm" disabled={busy} onClick={() => go([...ops, 'D'], cap, true)}>
          <Layers size={13} /> Dequeue
        </Button>
        <Button size="sm" variant="ghost" onClick={() => go([])}>
          <RotateCcw size={13} /> Clear
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button key={p.label} className={chip} onClick={() => go(p.ops)}>
            {p.label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-3 text-[12.5px] text-ink-2">
        Capacity
        <input type="range" min={4} max={12} value={cap} onChange={(e) => setCap(+e.target.value)} onPointerUp={() => go(ops)} onKeyUp={() => go(ops)} className="flex-1" />
        <span className="w-6 font-mono font-semibold text-ink">{cap}</span>
      </label>
      <div className="flex flex-wrap gap-1 font-mono text-[11.5px]" aria-label="Operation sequence">
        {ops.map((o, i) => (
          <span key={i} className={clsx('rounded-md px-1.5 py-0.5', o === 'E' ? 'bg-primary-wash text-primary-ink' : 'bg-[var(--band-watch-wash)] text-[var(--band-severe)]')}>
            {o === 'E' ? 'enq' : 'deq'}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- linked list */
export function ListControls({ run, busy }: P) {
  const [st, setSt] = useState('DEL')
  const [limit, setLimit] = useState(5)
  const [n, setN] = useState(8)
  const { obs } = useStationObs(st)
  const go = (count = n, lim = limit) => {
    const items = obs.slice(-count).map((o: Observation) => ({ id: o.id, stationId: o.stationId, date: dInt(o.observedAt), temperatureC: o.temperatureC }))
    run(lab('list.demo', { limit: lim, items }, 'list'), count > n ? lastCall : undefined)
  }
  useEffect(() => { if (obs.length) go() }, [obs.length > 0, st]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <StationSelect value={st} onChange={setSt} />
        <Button variant="primary" size="sm" disabled={busy || !obs.length} onClick={() => (setN(n + 1), go(n + 1))}>
          <Square size={13} /> Append next reading
        </Button>
      </div>
      <label className="flex items-center gap-3 text-[12.5px] text-ink-2">
        History limit
        <input type="range" min={3} max={7} value={limit} onChange={(e) => setLimit(+e.target.value)} onPointerUp={() => go(n, limit)} onKeyUp={() => go(n, limit)} className="flex-1" />
        <span className="w-6 font-mono font-semibold text-ink">{limit}</span>
      </label>
      <p className="text-[12px] text-ink-3">Appends the station&apos;s last {n} daily readings; once the limit is reached each append drops the oldest node at the head.</p>
    </div>
  )
}

/* ---------------------------------------------------------------- BST */
export function BstControls({ run, busy }: P) {
  const [st, setSt] = useState('DEL')
  const [order, setOrder] = useState<'balanced' | 'chronological'>('chronological')
  const [query, setQuery] = useState<'range' | 'search'>('range')
  const { obs } = useStationObs(st)
  const rows = obs.slice(-15)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const f = from || rows[7]?.observedAt || ''
  const t = to || rows[11]?.observedAt || ''
  const go = (o = order, q = query) =>
    rows.length &&
    run(lab('bst.demo', { order: o, query: q, readings: rows.map((r) => ({ id: r.id, date: dInt(r.observedAt), t: r.temperatureC })), from: dInt(f), to: dInt(t), date: dInt(t) }, 'bst'))
  useEffect(() => { go() }, [rows.length > 0, st]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <StationSelect value={st} onChange={setSt} />
        <Segmented label="Build order" value={order} onChange={(o) => (setOrder(o), go(o))} options={[{ value: 'chronological', label: 'Chronological' }, { value: 'balanced', label: 'Balanced' }]} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Segmented label="Query" value={query} onChange={(q) => (setQuery(q), go(order, q))} options={[{ value: 'range', label: 'Range' }, { value: 'search', label: 'Search' }]} />
        {query === 'range' && <input type="date" aria-label="From" className={input} value={f} min={rows[0]?.observedAt} max={t} onChange={(e) => setFrom(e.target.value)} />}
        <input type="date" aria-label={query === 'range' ? 'To' : 'Date'} className={input} value={t} min={rows[0]?.observedAt} max={rows.at(-1)?.observedAt} onChange={(e) => setTo(e.target.value)} />
        <Button size="sm" variant="primary" disabled={busy} onClick={() => go()}>
          Run
        </Button>
      </div>
      <p className="text-[12px] text-ink-3">15 daily readings. Chronological insertion makes a skewed tree (O(n)); the balanced rebuild is what the engine does after a reload.</p>
    </div>
  )
}

/* ---------------------------------------------------------------- hash */
export function HashControls({ run, busy }: P) {
  const [key, setKey] = useState('JAI')
  const { stations } = useStationObs('DEL')
  const go = (k = key) => (setKey(k), run(lab('hash.lookup', { key: k }, 'hash')))
  useEffect(() => { go() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-3">
      <form className="flex gap-2" onSubmit={(e) => (e.preventDefault(), go())}>
        <input aria-label="Station id" className={clsx(input, 'w-28 font-mono uppercase')} value={key} maxLength={8} onChange={(e) => setKey(e.target.value.toUpperCase())} />
        <Button size="sm" variant="primary" type="submit" disabled={busy}>
          Look up
        </Button>
      </form>
      <div className="flex flex-wrap gap-1.5">
        {[...stations.map((s) => s.id), 'XYZ'].map((k) => (
          <button key={k} className={clsx(chip, 'font-mono')} onClick={() => go(k)}>
            {k}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- graph */
export function GraphControls({ run, busy, setGraph }: P) {
  const [algo, setAlgo] = useState<'bfs' | 'dfs'>('bfs')
  const [thr, setThr] = useState(40)
  const stations = useQuery({ queryKey: ['stations'], queryFn: api.stations })
  const comps = useQuery({ queryKey: ['components', 'bfs'], queryFn: () => api.components('bfs') })
  const go = (a = algo, th = thr) => {
    if (!stations.data || !comps.data) return
    const hot = stations.data.filter((s) => (s.latest?.temperatureC ?? -99) >= th).map((s) => s.id)
    const st = stations.data
    const edges = comps.data.edges
    run(async () => {
      const t = await api.labTrace('graph.components', { hot, algorithm: a }, 'graph')
      setGraph?.({ stations: st, edges, hot: (t.result as { components: string[][] }).components.flat() }) // hot set exactly as traversed
      return t
    })
  }
  useEffect(() => { go() }, [!!stations.data && !!comps.data]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-3">
      <Segmented label="Traversal" value={algo} onChange={(a) => (setAlgo(a), go(a))} options={[{ value: 'bfs', label: 'BFS (queue)' }, { value: 'dfs', label: 'DFS (stack)' }]} />
      <label className="flex items-center gap-3 text-[12.5px] text-ink-2">
        Hot if ≥
        <input type="range" min={36} max={46} step={0.5} value={thr} disabled={busy} onChange={(e) => setThr(+e.target.value)} onPointerUp={() => go()} onKeyUp={() => go()} className="flex-1" />
        <span className="w-14 font-mono font-semibold text-ink">{thr} °C</span>
      </label>
      <p className="text-[12px] text-ink-3">Uses each cell&apos;s latest replayed reading. Edges join cells within 450 km; traversal runs only over hot cells.</p>
    </div>
  )
}

/* ---------------------------------------------------------------- sort + binary search */
export function SortControls({ run, busy }: P) {
  const [st, setSt] = useState('DEL')
  const { obs } = useStationObs(st)
  const [sorted, setSorted] = useState<{ id: number; date: number; t: number }[] | null>(null)
  const [target, setTarget] = useState('')
  const sort = () => {
    const values = obs.slice(-12).map((o) => ({ id: o.id, date: dInt(o.observedAt), t: o.temperatureC }))
    run(async () => {
      const t = await api.labTrace('sort.merge', { values, key: 't' }, 'sort')
      const s = (t.result as { sorted: { id: number; date: string; t: number }[] }).sorted.map((r) => ({ ...r, date: dInt(r.date) }))
      setSorted(s)
      setTarget(String(s[Math.floor(s.length * 0.7)]?.t ?? ''))
      return t
    })
  }
  useEffect(() => { if (obs.length) sort() }, [obs.length > 0, st]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <StationSelect value={st} onChange={setSt} />
        <Button size="sm" variant="primary" disabled={busy || !obs.length} onClick={sort}>
          Merge sort 12 readings
        </Button>
      </div>
      <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => (e.preventDefault(), sorted && run(lab('search.binary', { values: sorted, key: 't', target: +target }, 'sort')))}>
        <span className="text-[12.5px] text-ink-2">Binary search for</span>
        <input aria-label="Target temperature" className={clsx(input, 'w-20 font-mono')} value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" />
        <span className="text-[12.5px] text-ink-3">°C</span>
        <Button size="sm" type="submit" disabled={busy || !sorted}>
          Search
        </Button>
      </form>
      <p className="text-[12px] text-ink-3">Binary search runs on the sorted output; its cost is separate from the O(n log n) sort that prepared it.</p>
    </div>
  )
}

/* ---------------------------------------------------------------- stack */
const EXPRS = ['(t - normal) * 2 + 1', 't - normal', '-(t - 40) / 2', '(t + normal) / 2']
export function StackControls({ run, busy }: P) {
  const [st, setSt] = useState('DEL')
  const [expr, setExpr] = useState(EXPRS[0])
  const stations = useQuery({ queryKey: ['stations'], queryFn: api.stations })
  const s = stations.data?.find((x) => x.id === st)
  const t = s?.latest?.temperatureC ?? 45.1
  const normal = +(t - (s?.latest?.departureC ?? 4.6)).toFixed(1)
  const go = (e = expr) => (setExpr(e), run(lab('stack.eval', { expr: e, vars: { t, normal } }, 'stack')))
  useEffect(() => { if (stations.data) go() }, [!!stations.data]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <StationSelect value={st} onChange={setSt} />
        <span className="font-mono text-[12px] text-ink-3">
          t = {t} · normal = {normal}
        </span>
      </div>
      <form className="flex gap-2" onSubmit={(e) => (e.preventDefault(), go())}>
        <input aria-label="Formula" className={clsx(input, 'flex-1 font-mono')} value={expr} onChange={(e) => setExpr(e.target.value)} />
        <Button size="sm" variant="primary" type="submit" disabled={busy}>
          Evaluate
        </Button>
      </form>
      <div className="flex flex-wrap gap-1.5">
        {EXPRS.map((x) => (
          <button key={x} className={clsx(chip, 'font-mono')} onClick={() => go(x)}>
            {x}
          </button>
        ))}
      </div>
      <p className="text-[12px] text-ink-3">Allowed: numbers, t, normal, + − * / ( ) and unary minus. The result is a custom demonstration score, not a meteorological index.</p>
    </div>
  )
}

export const CONTROLS: Record<StructureKey, (p: P) => React.ReactElement> = {
  queue: QueueControls,
  list: ListControls,
  bst: BstControls,
  hash: HashControls,
  graph: GraphControls,
  sort: SortControls,
  stack: StackControls,
}
