import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { Braces, CircleDot, GitBranch, Hash, Link2, ListOrdered, Maximize2, Minus, MousePointerClick, MoveVertical, Network, Plus, SquareStack } from 'lucide-react'
import type { QueueState, StructureKey, Trace } from '../../lib/types'
import { Pill, Segmented } from '../../components/ui'
import { QueueRing2D } from '../dashboard/QueueRing2D'
import { useCurrentStep, useLabView, usePlayer, useScrollSteps, useStageZoom } from './player'
import { COMPLEXITY, PSEUDO } from './pseudocode'
import { StepRail } from './StepRail'
import { CONTROLS, type Run } from './LabControls'
import type { GraphContext } from './scenes/types'

const Stage = lazy(() => import('./Stage'))

const STRUCTURES: { key: StructureKey; label: string; icon: typeof CircleDot; blurb: string }[] = [
  { key: 'queue', label: 'Circular queue', icon: CircleDot, blurb: 'Buffers readings between replay and processing. Fixed array, counter method, explicit overflow.' },
  { key: 'list', label: 'Linked list', icon: Link2, blurb: 'Bounded recent history per station: append at the tail, drop the oldest at the head.' },
  { key: 'bst', label: 'BST', icon: GitBranch, blurb: 'Per-station index keyed by date: search path, pruned range query, and the cost of skew.' },
  { key: 'hash', label: 'Hash table', icon: Hash, blurb: 'Station-ID lookup with separate chaining. Collisions stack up as taller columns.' },
  { key: 'graph', label: 'Graph BFS/DFS', icon: Network, blurb: 'Cells within 450 km are connected; traversal over hot cells finds connected hot regions.' },
  { key: 'sort', label: 'Sort & search', icon: ListOrdered, blurb: 'Merge sort a history snapshot by temperature, then binary search the sorted output.' },
  { key: 'stack', label: 'Stack', icon: SquareStack, blurb: 'A formula goes infix → postfix with an operator stack, then is evaluated with a value stack.' },
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

const SOURCE_LABEL: Record<Trace['source'], string> = { engine: 'C++ engine (WebAssembly)', recorded: 'recorded C++ engine trace', mock: 'mock engine (dev)' }

export default function LabPage() {
  const { structure = 'queue' } = useParams()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const meta = STRUCTURES.find((s) => s.key === structure) ?? STRUCTURES[0]
  const active = meta.key
  const webgl = useMemo(hasWebGL, [])
  const reduced = useReducedMotion()
  const [mode, setMode] = useState<'3d' | '2d'>(webgl ? '3d' : '2d')
  const [rawOpen, setRawOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [graph, setGraph] = useState<GraphContext | undefined>()
  const deepStep = useRef(Number(params.get('step')) || 0)
  const { trace, step, cur } = useCurrentStep()

  // scroll-controlled playback: engaged by clicking the stage; released by clicking outside or Esc
  const stageRef = useRef<HTMLDivElement>(null)
  const [engaged, setEngaged] = useState(false)
  useScrollSteps(stageRef, engaged)
  useStageZoom(stageRef)
  const { zoom, zoomBy, reset: resetView } = useLabView()
  useEffect(() => {
    if (!engaged) return
    const out = (e: PointerEvent) => !stageRef.current?.contains(e.target as Node) && setEngaged(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setEngaged(false)
    document.addEventListener('pointerdown', out)
    window.addEventListener('keydown', esc)
    return () => (document.removeEventListener('pointerdown', out), window.removeEventListener('keydown', esc))
  }, [engaged])

  useEffect(() => {
    usePlayer.setState({ trace: null, step: 0 })
    useLabView.getState().reset()
  }, [active])

  const run: Run = async (load, jumpTo) => {
    setBusy(true)
    setError(null)
    try {
      const t = await load()
      const start = deepStep.current || (jumpTo ? jumpTo(t) : 0)
      setTimeout(() => (deepStep.current = 0), 1000) // StrictMode runs the first load twice in dev
      usePlayer.getState().load(t, start)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  // keep ?step= in the URL so a frame can be deep-linked from the report
  useEffect(() => {
    if (!trace) return
    const p = new URLSearchParams(params)
    p.set('step', String(step))
    setParams(p, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, trace])

  const Controls = CONTROLS[active]
  const listing = cur ? PSEUDO[active][String(cur.event.op ?? '')] : undefined
  const show2d = mode === '2d' && active === 'queue'

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <div className="border-b border-line bg-surface/60 px-4 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3">
          <div className="mr-2">
            <div className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">Structure Lab</div>
            <h1 className="font-display text-[20px] leading-tight font-semibold">Watch the engine think</h1>
          </div>
          <nav aria-label="Structures" className="flex flex-1 gap-1 overflow-x-auto pb-0.5">
            {STRUCTURES.map((s) => {
              const Icon = s.icon
              return (
                <button
                  key={s.key}
                  onClick={() => nav(`/lab/${s.key}`)}
                  aria-current={s.key === active ? 'page' : undefined}
                  className={clsx(
                    'flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors',
                    s.key === active ? 'bg-ink text-page' : 'text-ink-2 hover:bg-sunken',
                  )}
                >
                  <Icon size={15} />
                  {s.label}
                </button>
              )
            })}
          </nav>
          {active === 'queue' && webgl && (
            <Segmented label="Render mode" value={mode} onChange={setMode} options={[{ value: '3d', label: '3D' }, { value: '2d', label: '2D' }]} />
          )}
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1600px] flex-1 gap-4 p-4 md:p-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div
          ref={stageRef}
          onPointerDown={() => setEngaged(true)}
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setEngaged(true)}
          aria-label="Structure stage. Click or press Enter, then scroll or use arrow keys to step through the trace. Escape releases."
          className={clsx(
            'relative h-[min(76vh,720px)] min-h-[440px] overflow-hidden rounded-3xl border shadow-clay transition-[box-shadow,border-color] lab-stage',
            engaged ? 'border-primary ring-4 ring-primary/25' : 'border-line',
          )}
        >
          {!cur ? (
            <div className="absolute inset-0 grid place-items-center px-8 text-center text-ink-3">{busy ? 'Running on the engine…' : (error ?? 'Preparing…')}</div>
          ) : show2d || !webgl ? (
            active === 'queue' ? (
              <div className="absolute inset-0 grid place-items-center p-8">
                <div className="w-full max-w-[420px]">
                  <QueueRing2D q={cur.state as QueueState} size={320} highlight={typeof cur.event.slot === 'number' ? (cur.event.slot as number) : null} />
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 grid place-items-center px-8 text-center text-ink-3">This scene needs WebGL. The narration, pseudo-code and variables still follow every step.</div>
            )
          ) : (
            <Suspense fallback={<div className="absolute inset-0 grid place-items-center text-ink-3">Loading 3D scene…</div>}>
              <Stage structure={active} trace={trace!} step={step} reduced={reduced} graph={graph} />
            </Suspense>
          )}

          {trace && (
            <>
              <span className="pointer-events-none absolute top-3 left-3 rounded-full border border-line bg-surface/85 px-3 py-1 text-[11.5px] font-medium text-ink-2 backdrop-blur">
                Trace from {SOURCE_LABEL[trace.source]} · {trace.requestId} · {trace.engineTimeMs.toFixed(2)} ms{trace.truncated ? ' · truncated' : ''}
              </span>
              <span
                className={clsx(
                  'pointer-events-none absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium shadow-card backdrop-blur transition-colors',
                  engaged ? 'bg-primary text-white dark:text-[#04231f]' : 'bg-surface/85 text-ink-2',
                )}
              >
                {engaged ? <MoveVertical size={13} /> : <MousePointerClick size={13} />}
                {engaged ? 'Scroll ↕ to step · ctrl+scroll or pinch to zoom · right-drag to pan · Esc to release' : 'Click to control with scroll'}
              </span>
              <StepRail />
            </>
          )}
          {cur && (
            <p aria-live="polite" className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-4.5rem)] rounded-2xl border border-line bg-surface/90 px-4 py-2.5 text-[14px] font-medium text-ink shadow-lift backdrop-blur md:max-w-[70%]">
              {cur.note}
            </p>
          )}
          {cur && webgl && !show2d && (
            <div className="absolute right-12 bottom-3 flex items-center gap-1 rounded-full border border-line bg-surface/90 p-1 shadow-card backdrop-blur" onPointerDown={(e) => e.stopPropagation()}>
              <button className="grid size-7 place-items-center rounded-full hover:bg-sunken" title="Zoom out (− or ctrl + wheel)" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.25)}>
                <Minus size={14} />
              </button>
              <span className="w-10 text-center font-mono text-[11px] text-ink-3 tabular">{Math.round(zoom * 100)}%</span>
              <button className="grid size-7 place-items-center rounded-full hover:bg-sunken" title="Zoom in (+ or ctrl + wheel / pinch)" aria-label="Zoom in" onClick={() => zoomBy(1.25)}>
                <Plus size={14} />
              </button>
              <button className="grid size-7 place-items-center rounded-full hover:bg-sunken" title="Reset view (0)" aria-label="Reset view" onClick={resetView}>
                <Maximize2 size={13} />
              </button>
            </div>
          )}
          {error && cur && <p className="absolute right-12 bottom-3 rounded-xl bg-[var(--band-heat-wash)] px-3 py-1.5 text-[12.5px] text-danger">{error}</p>}
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <section className="rounded-2xl border border-line bg-surface p-4 shadow-card">
            <h2 className="text-[15px] font-semibold">{meta.label}</h2>
            <p className="mt-1 mb-4 text-[13px] text-ink-2">{meta.blurb}</p>
            <Controls key={active} run={run} busy={busy} setGraph={setGraph} />
          </section>

          {cur && listing && (
            <section className="rounded-2xl border border-line bg-surface p-4 shadow-card">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold">Pseudo-code · {String(cur.event.op)}</h3>
                <Pill tone="primary">line {cur.line || '—'}</Pill>
              </div>
              <pre className="overflow-x-auto rounded-xl bg-sunken p-2 font-mono text-[12px] leading-[1.75]">
                {listing.map((l, i) => (
                  <div key={i} className={clsx('rounded-md px-2 transition-colors', cur.line === i + 1 ? 'bg-primary text-white dark:text-[#04231f]' : 'text-ink-2')}>
                    <span className="mr-3 inline-block w-4 text-right opacity-50 select-none">{i + 1}</span>
                    {l || ' '}
                  </div>
                ))}
              </pre>
            </section>
          )}

          {cur && (
            <section className="rounded-2xl border border-line bg-surface p-4 shadow-card">
              {Object.keys(cur.vars).length > 0 && (
                <>
                  <h3 className="mb-2 text-[13px] font-semibold">Variables</h3>
                  <dl className="mb-4 grid grid-cols-2 gap-2">
                    {Object.entries(cur.vars).map(([k, v]) => (
                      <div key={k} className="min-w-0 rounded-xl bg-sunken px-3 py-2">
                        <dt className="text-[11px] text-ink-3">{k}</dt>
                        <dd className="truncate font-mono text-[15px] font-semibold">{v ?? '—'}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
              <h3 className="mb-2 text-[13px] font-semibold">Counters</h3>
              <dl className="grid grid-cols-3 gap-2">
                {Object.entries(cur.counters).map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-line px-3 py-2">
                    <dt className="truncate text-[11px] text-ink-3">{k}</dt>
                    <dd className="font-mono text-[16px] font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {COMPLEXITY[active].map((c) => (
                  <span key={c} className="rounded-lg bg-primary-wash px-2 py-1 font-mono text-[11.5px] text-primary-ink">
                    {c}
                  </span>
                ))}
              </div>
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
