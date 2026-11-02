import { usePlayer } from './player'

/** Notable events get a marker on the progress rail. */
const MARKERS: Record<string, { color: string; label: string }> = {
  reject_full: { color: 'var(--band-severe)', label: 'Overflow rejected' },
  reject_empty: { color: 'var(--band-watch)', label: 'Underflow' },
  wrap: { color: 'var(--band-watch)', label: 'Wraparound' },
  evict: { color: 'var(--band-heat)', label: 'Oldest removed' },
  prune: { color: 'var(--ink-3)', label: 'Subtree pruned' },
  emit: { color: 'var(--ok)', label: 'In range' },
  found: { color: 'var(--ok)', label: 'Found' },
  bs_found: { color: 'var(--ok)', label: 'Found' },
  miss: { color: 'var(--band-severe)', label: 'Not found' },
  bs_miss: { color: 'var(--band-severe)', label: 'Not found' },
  probe_chain: { color: 'var(--band-watch)', label: 'Collision' },
  component_done: { color: 'var(--primary)', label: 'Component complete' },
  merge_done: { color: 'var(--primary)', label: 'Merged' },
  result: { color: 'var(--ok)', label: 'Result' },
}

/** Vertical progress rail on the stage edge (replaces the play bar; playback is scroll-driven). */
export function StepRail() {
  const trace = usePlayer((s) => s.trace)
  const step = usePlayer((s) => s.step)
  if (!trace) return null
  const total = trace.steps.length
  const pct = (i: number) => (i / Math.max(1, total - 1)) * 100
  return (
    <div className="pointer-events-none absolute top-14 right-4 bottom-20 flex flex-col items-center gap-2" aria-hidden>
      <span className="rounded-full bg-surface/90 px-2 py-0.5 font-mono text-[11px] text-ink-2 shadow-card backdrop-blur tabular">
        {step + 1}/{total}
      </span>
      <div className="relative w-1.5 flex-1 rounded-full bg-ink/10">
        <div className="absolute inset-x-0 top-0 rounded-full bg-primary transition-[height] duration-200" style={{ height: `${pct(step)}%` }} />
        {trace.steps.map((s, i) =>
          MARKERS[s.event.type] ? (
            <span
              key={i}
              title={MARKERS[s.event.type].label}
              className="absolute left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
              style={{ top: `${pct(i)}%`, background: MARKERS[s.event.type].color }}
            />
          ) : null,
        )}
        <span className="absolute left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-3 ring-surface" style={{ top: `${pct(step)}%` }} />
      </div>
    </div>
  )
}
