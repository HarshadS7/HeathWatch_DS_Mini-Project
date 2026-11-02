import clsx from 'clsx'
import { ChevronFirst, ChevronLast, Pause, Play, StepBack, StepForward } from 'lucide-react'
import { usePlayer } from './player'
import { Button } from '../../components/ui'

/** Notable events get a coloured marker on the scrubber. */
const MARKERS: Record<string, { color: string; label: string }> = {
  reject_full: { color: 'var(--band-severe)', label: 'Overflow rejected' },
  reject_empty: { color: 'var(--band-watch)', label: 'Underflow' },
  wrap: { color: 'var(--band-watch)', label: 'Wraparound' },
  call: { color: 'var(--line-strong)', label: 'Operation start' },
}

const SPEEDS = [0.5, 1, 2, 4]

export function PlayerBar() {
  const { trace, step, playing, speed, seek, next, prev, toggle, pause, setSpeed } = usePlayer()
  if (!trace) return null
  const total = trace.steps.length
  const nextOfType = (type: string) => {
    const i = trace.steps.findIndex((s, k) => k > step && s.event.type === type)
    if (i >= 0) (pause(), seek(i))
  }
  const present = Array.from(new Set(trace.steps.map((s) => s.event.type))).filter((t) => MARKERS[t] && t !== 'call')

  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-2.5 shadow-card md:px-4">
      <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" title="First step (Home)" onClick={() => (pause(), seek(0))}>
            <ChevronFirst size={17} />
          </Button>
          <Button size="icon" variant="ghost" title="Previous step (←)" onClick={() => (pause(), prev())}>
            <StepBack size={16} />
          </Button>
          <Button size="icon" variant="primary" title={playing ? 'Pause (Space)' : 'Play (Space)'} onClick={toggle}>
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </Button>
          <Button size="icon" variant="ghost" title="Next step (→)" onClick={() => (pause(), next())}>
            <StepForward size={16} />
          </Button>
          <Button size="icon" variant="ghost" title="Last step (End)" onClick={() => (pause(), seek(total - 1))}>
            <ChevronLast size={17} />
          </Button>
        </div>

        <div className="relative order-last w-full min-w-0 flex-1 md:order-none">
          <input
            type="range"
            min={0}
            max={total - 1}
            value={step}
            onChange={(e) => (pause(), seek(Number(e.target.value)))}
            aria-label="Trace step"
            aria-valuetext={`Step ${step + 1} of ${total}`}
            className="relative z-10 w-full"
          />
          <div className="pointer-events-none absolute inset-x-[8px] top-1/2 h-0" aria-hidden>
            {trace.steps.map((s, i) => {
              const m = MARKERS[s.event.type]
              if (!m) return null
              return (
                <span
                  key={i}
                  className={clsx('absolute -translate-x-1/2 rounded-full', s.event.type === 'call' ? 'top-2 h-1.5 w-px' : 'top-2 size-2')}
                  style={{ left: `${(i / Math.max(1, total - 1)) * 100}%`, background: m.color }}
                />
              )
            })}
          </div>
        </div>

        <span className="w-[86px] text-right font-mono text-[12px] text-ink-3 tabular">
          {step + 1} / {total}
        </span>

        <div className="flex items-center rounded-xl bg-sunken p-0.5" role="radiogroup" aria-label="Playback speed">
          {SPEEDS.map((s) => (
            <button
              key={s}
              role="radio"
              aria-checked={speed === s}
              onClick={() => setSpeed(s)}
              className={clsx('rounded-[10px] px-2 py-1 font-mono text-[11.5px]', speed === s ? 'bg-surface text-ink shadow-card' : 'text-ink-3')}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
      {present.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-2 text-[12px] text-ink-3">
          Jump to next:
          {present.map((t) => (
            <button key={t} onClick={() => nextOfType(t)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 hover:bg-sunken hover:text-ink">
              <span className="size-2 rounded-full" style={{ background: MARKERS[t].color }} />
              {MARKERS[t].label}
            </button>
          ))}
          <span className="ml-auto hidden md:inline">Space play · ←/→ step · Home/End · +/− speed</span>
        </div>
      )}
    </div>
  )
}
