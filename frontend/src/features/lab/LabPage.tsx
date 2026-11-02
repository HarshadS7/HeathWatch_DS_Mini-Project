import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { Box, Braces, CircleDot, GitBranch, Hash, Layers, Link2, ListOrdered, Network, RotateCcw, Square, SquareStack } from 'lucide-react'
import { api } from '../../lib/api'
import type { QueueState, StructureKey, Trace } from '../../lib/types'
import { Button, Pill, Segmented } from '../../components/ui'
import { QueueRing2D } from '../dashboard/QueueRing2D'
import { useCurrentStep, usePlaybackClock, usePlayer, usePlayerKeys } from './player'
import { COMPLEXITY, PSEUDO } from './pseudocode'
import { PlayerBar } from './PlayerBar'

const Stage = lazy(() => import('./Stage'))

const STRUCTURES: { key: StructureKey; label: string; icon: typeof Box; ready: boolean; blurb: string }[] = [
  { key: 'queue', label: 'Circular queue', icon: CircleDot, ready: true, blurb: 'Buffers readings between replay and processing. Fixed array, counter method, explicit overflow.' },
  { key: 'list', label: 'Linked list', icon: Link2, ready: false, blurb: 'Bounded recent history per station: append at tail, drop oldest at head.' },
  { key: 'bst', label: 'BST', icon: GitBranch, ready: false, blurb: 'Per-station index keyed by (date, id): search path, range query, height.' },
  { key: 'hash', label: 'Hash table', icon: Hash, ready: false, blurb: 'Station-ID lookup with separate chaining, collisions and resize.' },
  { key: 'graph', label: 'Graph BFS/DFS', icon: Network, ready: false, blurb: 'Stations within 450 km are connected; traversal finds hot regions.' },
  { key: 'sort', label: 'Sort & search', icon: ListOrdered, ready: false, blurb: 'Merge sort a history snapshot, then binary search it.' },
  { key: 'stack', label: 'Stack', icon: SquareStack, ready: false, blurb: 'Infix → postfix with an operator stack, evaluated with a value stack.' },
]

const PRESETS: { id: string; label: string; ops: ('E' | 'D')[] }[] = [
  { id: 'basic', label: 'Enqueue & dequeue', ops: ['E', 'E', 'E', 'D', 'E', 'D'] },
  { id: 'wrap', label: 'Wraparound', ops: ['E', 'E', 'E', 'E', 'E', 'E', 'D', 'D', 'D', 'D', 'E', 'E', 'E', 'E'] },
  { id: 'overflow', label: 'Fill & overflow', ops: ['E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'D', 'E'] },
]

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

function useReducedMotion() {
  const [r, setR] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setR(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return r
}

export default function LabPage() {
  const { structure = 'queue' } = useParams()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const active = (STRUCTURES.find((s) => s.key === structure) ?? STRUCTURES[0]).key
  const meta = STRUCTURES.find((s) => s.key === active)!
  const webgl = useMemo(hasWebGL, [])
  const reduced = useReducedMotion()
  const [mode, setMode] = useState<'3d' | '2d'>(webgl ? '3d' : '2d')
  const [rawOpen, setRawOpen] = useState(false)

  usePlaybackClock()
  usePlayerKeys()
  const load = usePlayer((s) => s.load)
  const { trace, step, cur } = useCurrentStep<QueueState>()

  // ---- queue operations: the op list is the input; every change re-runs the operation on the engine
  const [capacity, setCapacity] = useState(8)
  const [ops, setOps] = useState<('E' | 'D')[]>(PRESETS[0].ops)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(
    async (nextOps: ('E' | 'D')[], cap: number, jumpToLastOp = false) => {
      setBusy(true)
      setError(null)
      try {
        const t = (await api.queueDemo({ capacity: cap, ops: nextOps })) as Trace
        let start = 0
        if (jumpToLastOp) {
          const calls = t.steps.map((s, i) => (s.event.type === 'call' ? i : -1)).filter((i) => i >= 0)
          start = calls.length ? calls[calls.length - 1] : 0
        }
        const deep = Number(params.get('step'))
        load(t, !jumpToLastOp && Number.isFinite(deep) && deep > 0 ? deep : start)
        if (jumpToLastOp) usePlayer.getState().play()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [load],
  )

  useEffect(() => {
    if (active === 'queue') run(ops, capacity)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // keep ?step= in the URL so a frame can be deep-linked from the report
  useEffect(() => {
    if (!trace) return
    const p = new URLSearchParams(params)
    p.set('step', String(step))
    setParams(p, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, trace])

  const addOp = (o: 'E' | 'D') => {
    const next = [...ops, o]
    setOps(next)
    run(next, capacity, true)
  }

  const listing = cur ? PSEUDO[active]?.[String(cur.event.op ?? '')] : undefined

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* structure rail */}
      <div className="border-b border-line bg-surface/60 px-4 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3">
          <div className="mr-2">
            <div className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">Structure Lab</div>
            <h1 className="font-display text-[20px] leading-tight font-semibold">Watch the engine think</h1>
          </div>
          <nav aria-label="Structures" className="flex flex-1 gap-1 overflow-x-auto pb-0.5">
            {STRUCTURES.map((s, i) => {
              const Icon = s.icon
              return (
                <button
                  key={s.key}
                  onClick={() => nav(`/lab/${s.key}`)}
                  title={`${s.label} (${i + 1})`}
                  className={clsx(
                    'flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors',
                    s.key === active ? 'bg-ink text-page' : 'text-ink-2 hover:bg-sunken',
                  )}
                >
                  <Icon size={15} />
                  {s.label}
                  {!s.ready && <span className="rounded bg-sunken px-1 text-[10px] text-ink-3">soon</span>}
                </button>
              )
            })}
          </nav>
          <Segmented
            label="Render mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: '3d', label: '3D' },
              { value: '2d', label: '2D' },
            ]}
          />
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1600px] flex-1 gap-4 p-4 md:p-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* stage */}
        <div className="flex min-w-0 flex-col gap-3">
          <div className="relative h-[min(68vh,640px)] min-h-[420px] overflow-hidden rounded-3xl border border-line shadow-clay lab-stage">
            {!meta.ready ? (
              <ComingSoon label={meta.label} blurb={meta.blurb} />
            ) : !cur ? (
              <div className="absolute inset-0 grid place-items-center text-ink-3">{busy ? 'Running on engine…' : error ?? 'No trace loaded'}</div>
            ) : mode === '3d' && webgl ? (
              <Suspense fallback={<div className="absolute inset-0 grid place-items-center text-ink-3">Loading 3D scene…</div>}>
                <Stage structure={active} step={cur} reduced={reduced} />
              </Suspense>
            ) : (
              <div className="absolute inset-0 grid place-items-center p-8">
                <div className="w-full max-w-[420px]">
                  <QueueRing2D q={cur.state} size={320} highlight={typeof cur.event.slot === 'number' ? (cur.event.slot as number) : null} />
                </div>
              </div>
            )}

            {/* provenance badge */}
            {trace && meta.ready && (
              <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-2">
                <span className="pointer-events-auto rounded-full border border-line bg-surface/85 px-3 py-1 text-[11.5px] font-medium text-ink-2 backdrop-blur">
                  Trace from {trace.source === 'engine' ? 'C++ engine' : 'mock engine (dev)'} · {trace.requestId} · {trace.engineTimeMs.toFixed(2)} ms
                </span>
                {!webgl && <span className="rounded-full bg-[var(--band-watch-wash)] px-3 py-1 text-[11.5px] font-medium">WebGL unavailable · 2D mode</span>}
              </div>
            )}
            {cur && meta.ready && (
              <div className="pointer-events-none absolute right-3 bottom-3 left-3 md:right-auto md:max-w-[70%]">
                <p aria-live="polite" className="rounded-2xl border border-line bg-surface/90 px-4 py-2.5 text-[14px] font-medium text-ink shadow-lift backdrop-blur">
                  {cur.note}
                </p>
              </div>
            )}
          </div>
          {meta.ready && <PlayerBar />}
        </div>

        {/* side panel */}
        <aside className="flex min-w-0 flex-col gap-4">
          <section className="rounded-2xl border border-line bg-surface p-4 shadow-card">
            <h2 className="text-[15px] font-semibold">{meta.label}</h2>
            <p className="mt-1 text-[13px] text-ink-2">{meta.blurb}</p>
            {active === 'queue' && (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" size="sm" onClick={() => addOp('E')} disabled={busy}>
                    <Square size={13} /> Enqueue reading
                  </Button>
                  <Button size="sm" onClick={() => addOp('D')} disabled={busy}>
                    <Layers size={13} /> Dequeue
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setOps([])
                      run([], capacity)
                    }}
                  >
                    <RotateCcw size={13} /> Clear
                  </Button>
                </div>
                <div>
                  <div className="mb-1.5 text-[12px] font-medium text-ink-3">Scenarios</div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESETS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setOps(p.ops)
                          run(p.ops, capacity)
                        }}
                        className="rounded-lg border border-line px-2.5 py-1 text-[12.5px] hover:border-primary hover:text-primary"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-3 text-[12.5px] text-ink-2">
                  Capacity
                  <input
                    type="range"
                    min={4}
                    max={12}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    onPointerUp={() => run(ops, capacity)}
                    onKeyUp={() => run(ops, capacity)}
                    className="flex-1"
                  />
                  <span className="w-6 font-mono font-semibold text-ink">{capacity}</span>
                </label>
                <div className="flex flex-wrap gap-1 font-mono text-[11.5px]" aria-label="Operation sequence">
                  {ops.map((o, i) => (
                    <span key={i} className={clsx('rounded-md px-1.5 py-0.5', o === 'E' ? 'bg-primary-wash text-primary-ink' : 'bg-[var(--band-watch-wash)] text-[var(--band-severe)]')}>
                      {o === 'E' ? 'enq' : 'deq'}
                    </span>
                  ))}
                  {!ops.length && <span className="text-ink-3">empty sequence</span>}
                </div>
                {error && <p className="text-[12.5px] text-danger">{error}</p>}
              </div>
            )}
          </section>

          {cur && listing && (
            <section className="rounded-2xl border border-line bg-surface p-4 shadow-card">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold">Pseudo-code · {String(cur.event.op)}</h3>
                <Pill tone="primary">line {cur.line || '—'}</Pill>
              </div>
              <pre className="overflow-x-auto rounded-xl bg-sunken p-2 font-mono text-[12.5px] leading-[1.75]">
                {listing.map((l, i) => (
                  <div
                    key={i}
                    className={clsx('rounded-md px-2 transition-colors', cur.line === i + 1 ? 'bg-primary text-white dark:text-[#04231f]' : 'text-ink-2')}
                  >
                    <span className="mr-3 inline-block w-4 text-right opacity-50 select-none">{i + 1}</span>
                    {l}
                  </div>
                ))}
              </pre>
            </section>
          )}

          {cur && (
            <section className="rounded-2xl border border-line bg-surface p-4 shadow-card">
              <h3 className="mb-2 text-[13px] font-semibold">Variables</h3>
              <dl className="grid grid-cols-2 gap-2">
                {Object.entries(cur.vars).map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-sunken px-3 py-2">
                    <dt className="text-[11px] text-ink-3">{k}</dt>
                    <dd className="font-mono text-[17px] font-semibold">{v ?? '—'}</dd>
                  </div>
                ))}
              </dl>
              <h3 className="mt-4 mb-2 text-[13px] font-semibold">Counters</h3>
              <dl className="grid grid-cols-3 gap-2">
                {Object.entries(cur.counters).map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-line px-3 py-2">
                    <dt className="text-[11px] text-ink-3">{k}</dt>
                    <dd className="font-mono text-[16px] font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              {COMPLEXITY[active] && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {COMPLEXITY[active]!.map((c) => (
                    <span key={c.op} className="rounded-lg bg-primary-wash px-2 py-1 font-mono text-[11.5px] text-primary-ink">
                      {c.op}: {c.time}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          {cur && (
            <section className="rounded-2xl border border-line bg-surface shadow-card">
              <button onClick={() => setRawOpen((o) => !o)} aria-expanded={rawOpen} className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] font-semibold">
                <Braces size={15} /> Raw trace step {step}
                <span className="ml-auto text-[11.5px] font-normal text-ink-3">{rawOpen ? 'hide' : 'show'}</span>
              </button>
              {rawOpen && (
                <pre className="max-h-72 overflow-auto border-t border-line px-4 py-3 font-mono text-[11px] leading-relaxed text-ink-2">
                  {JSON.stringify({ requestId: trace?.requestId, step, ...cur }, null, 2)}
                </pre>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}

function ComingSoon({ label, blurb }: { label: string; blurb: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center p-8 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-surface shadow-clay">
          <Box size={26} className="text-primary" />
        </div>
        <h2 className="font-display text-[22px] font-semibold">{label} diorama</h2>
        <p className="mt-2 text-[14px] text-ink-2">{blurb}</p>
        <p className="mt-3 text-[12.5px] text-ink-3">This scene is built in the next step, on the same diorama kit and player as the circular queue.</p>
      </div>
    </div>
  )
}
