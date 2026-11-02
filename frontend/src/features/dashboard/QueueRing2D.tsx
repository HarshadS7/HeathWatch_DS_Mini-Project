import type { QueueState } from '../../lib/types'
import { tempColor } from '../../lib/bands'

/** Compact 2D view of the circular queue — dashboard DS panel and the Lab's no-WebGL / 2D-mode fallback. */
export function QueueRing2D({ q, size = 220, highlight }: { q: QueueState; size?: number; highlight?: number | null }) {
  const c = size / 2
  const R = size * 0.36
  const n = q.capacity
  const slotArc = (Math.PI * 2) / n
  const pt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i + 0.5) * slotArc
    return [c + r * Math.cos(a), c + r * Math.sin(a)] as const
  }
  const arc = (i: number) => {
    const a0 = -Math.PI / 2 + i * slotArc + 0.03
    const a1 = a0 + slotArc - 0.06
    const r0 = R - 16
    const r1 = R + 16
    const p = (a: number, r: number) => `${c + r * Math.cos(a)},${c + r * Math.sin(a)}`
    return `M${p(a0, r1)} A${r1},${r1} 0 0 1 ${p(a1, r1)} L${p(a1, r0)} A${r0},${r0} 0 0 0 ${p(a0, r0)}Z`
  }
  const [fx, fy] = pt(q.front, R + 30)
  const [rx, ry] = pt(q.rear, R - 32)
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" role="img" aria-label={`Circular queue: ${q.count} of ${q.capacity} slots used, front ${q.front}, rear ${q.rear}`}>
      {q.slots.map((s, i) => (
        <path
          key={i}
          d={arc(i)}
          fill={s ? tempColor(s.temperatureC) : 'var(--sunken)'}
          stroke={highlight === i ? 'var(--primary)' : 'var(--surface)'}
          strokeWidth={highlight === i ? 2.5 : 1.5}
        >
          <title>{s ? `slot ${i}: ${s.stationId} ${s.temperatureC} °C` : `slot ${i}: empty`}</title>
        </path>
      ))}
      <text x={c} y={c - 4} textAnchor="middle" fontSize={size * 0.12} fontWeight={700} fill="var(--ink)" fontFamily="Fraunces, serif">
        {q.count}/{q.capacity}
      </text>
      <text x={c} y={c + 14} textAnchor="middle" fontSize={10.5} fill="var(--ink-3)">
        slots in use
      </text>
      <g fontSize={10} fontWeight={700}>
        <circle cx={fx} cy={fy} r={9} fill="var(--primary)" />
        <text x={fx} y={fy + 3.5} textAnchor="middle" fill="#fff">
          F
        </text>
        <circle cx={rx} cy={ry} r={9} fill="var(--band-watch)" />
        <text x={rx} y={ry + 3.5} textAnchor="middle" fill="#fff">
          R
        </text>
      </g>
    </svg>
  )
}
