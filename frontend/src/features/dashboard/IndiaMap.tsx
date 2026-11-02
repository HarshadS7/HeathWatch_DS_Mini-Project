import { useMemo } from 'react'
import { geoContains, geoMercator, geoPath, geoTransform } from 'd3-geo'
import type { Feature, FeatureCollection } from 'geojson'
import clsx from 'clsx'
import india from '../../assets/geo/india.json'
import states from '../../assets/geo/states.json'
import { BAND_META, BAND_ORDER } from '../../lib/bands'
import { fmtTemp } from '../../lib/format'
import { useIsDark } from '../../lib/useIsDark'
import type { Band, GraphEdge, StationSummary } from '../../lib/types'

/*
  "Raised plate" map: a tilted projection (y squashed) plus a stacked side wall gives a 3D look
  without WebGL. States are colour-coded with soft gradients and bold borders; hovering a city
  lifts its state out of the plate together with the city's marker.
*/
const W = 560
const H = 500
const TILT = 0.66 // vertical squash = viewing angle
const DEPTH = 30 // side-wall thickness in px (how high the states stand)
const LIFT = 14 // hover pop height in px

/** label offsets [dx, dy, anchor] to avoid collisions between nearby cities */
const LABEL: Record<string, [number, number, 'start' | 'end' | 'middle']> = {
  DEL: [0, -17, 'middle'],
  JAI: [-10, -13, 'end'],
  JDH: [-14, 4, 'end'],
  AMD: [0, 23, 'middle'],
  BOM: [-14, 4, 'end'],
  PNQ: [0, 23, 'middle'],
  BHO: [-14, 4, 'end'],
  LKO: [12, -12, 'start'],
  PRY: [12, 21, 'start'],
  PAT: [0, -15, 'middle'],
  MAA: [14, 4, 'start'],
  BLR: [-14, 4, 'end'],
}

interface Props {
  stations: StationSummary[]
  selected: string
  hover: string | null
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  edges?: GraphEdge[]
  components?: string[][]
  showEdges?: boolean
  className?: string
}

/** Subtle state tint from the legend: a band colour mixed into the surface (theme-aware via CSS vars). */
const tint = (band: Band | null, pct: number) => (band ? `color-mix(in srgb, ${BAND_META[band].varName} ${pct}%, var(--surface))` : `color-mix(in srgb, #d9c7a6 ${pct + 10}%, var(--surface))`)
const FILL_KEYS: (Band | 'none')[] = ['none', ...BAND_ORDER]

export function IndiaMap({ stations, selected, hover, onSelect, onHover, edges = [], components = [], showEdges = true, className }: Props) {
  const dark = useIsDark()
  const geo = useMemo(() => {
    const outline = india as unknown as FeatureCollection
    const st = states as unknown as FeatureCollection
    const base = geoMercator().fitExtent(
      [
        [18, 10],
        [W - 18, (H - DEPTH - 10) / TILT],
      ],
      outline,
    )
    const tilt = geoTransform({
      point(x, y) {
        const p = base([x, y])
        if (p) this.stream.point(p[0], p[1] * TILT + LIFT)
      },
    })
    const path = geoPath(tilt)
    return {
      outline: outline.features.map((f) => path(f) ?? '').join(' '),
      states: st.features.map((f, i) => ({ i, name: String(f.properties?.ST_NM ?? i), d: path(f) ?? '', f: f as Feature })),
      project: (lon: number, lat: number) => {
        const p = base([lon, lat])!
        return [p[0], p[1] * TILT + LIFT] as [number, number]
      },
    }
  }, [])

  const pos = useMemo(() => new Map(stations.map((s) => [s.id, geo.project(s.lon, s.lat)])), [stations, geo])
  const stateOf = useMemo(() => new Map(stations.map((s) => [s.id, geo.states.find((st) => geoContains(st.f, [s.lon, s.lat]))])), [stations, geo])
  // a state takes the hottest band among the monitored cells inside it; states without a cell stay neutral
  const stateBand = new Map<number, Band>()
  stations.forEach((s) => {
    const st = stateOf.get(s.id)
    const b = s.latest?.band
    if (st && b && BAND_ORDER.indexOf(b) >= BAND_ORDER.indexOf(stateBand.get(st.i) ?? 'normal')) stateBand.set(st.i, b)
  })
  const fillOf = (i: number) => `url(#fill-${stateBand.get(i) ?? 'none'})`
  const compOf = new Map<string, number>()
  components.forEach((c, i) => c.forEach((id) => compOf.set(id, i)))
  const hotIds = new Set(components.flat())
  const popped = hover ? stateOf.get(hover) : undefined

  const marker = (s: StationSummary, lifted: boolean) => {
    const p = pos.get(s.id)!
    const band = s.latest?.band ?? 'normal'
    const m = BAND_META[band]
    const r = 6 + BAND_ORDER.indexOf(band) * 1.5
    const isSel = s.id === selected
    const [lx, ly, anchor] = LABEL[s.id] ?? [r + 7, 4, 'start']
    return (
      <g
        key={s.id}
        transform={`translate(${p[0]},${p[1] - (lifted ? LIFT : 0)})`}
        className="cursor-pointer outline-none"
        style={{ transition: 'transform 220ms cubic-bezier(.2,.8,.2,1.2)' }}
        tabIndex={0}
        role="button"
        aria-label={`${s.name}: ${s.latest ? fmtTemp(s.latest.temperatureC) + ', ' + m.label : 'no reading yet'}`}
        aria-pressed={isSel}
        onClick={() => onSelect(s.id)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(s.id))}
        onMouseEnter={() => onHover(s.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(s.id)}
        onBlur={() => onHover(null)}
      >
        <ellipse rx={r + 3} ry={(r + 3) * TILT} cy={DEPTH * 0.18 + (lifted ? LIFT : 0)} fill="#000" opacity={lifted ? 0.18 : 0.12} />
        {band === 'severe' && <circle r={r} fill={m.varName} className="pulse-ring" />}
        <circle r={r + 7.5} fill="none" stroke={isSel ? 'var(--primary)' : 'var(--ink)'} strokeWidth={isSel ? 2.4 : 1.2} opacity={isSel || lifted ? 1 : 0.45} />
        <circle r={r + 2.5} fill="var(--surface)" />
        <circle r={r} fill={s.latest ? m.varName : 'var(--line-strong)'} />
        {band !== 'normal' && (
          <text y={3.2} textAnchor="middle" fontSize={band === 'severe' ? 9 : 7} fontWeight={700} fill="#fff" aria-hidden>
            {band === 'severe' ? '!' : '▲'}
          </text>
        )}
        <text x={lx} y={ly} textAnchor={anchor} fontSize={11.5} fontWeight={isSel || lifted ? 700 : 600} fill="var(--ink)" stroke="var(--surface)" strokeWidth={3.5} paintOrder="stroke">
          {s.name}
          {s.latest && (
            <tspan fill="var(--ink-2)" fontWeight={500}>
              {' '}
              {s.latest.temperatureC.toFixed(1)}°
            </tspan>
          )}
        </text>
      </g>
    )
  }

  return (
    <div className={clsx('relative', className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="Raised map of India: states colour-coded, monitored grid cells coloured by monitoring band">
        <defs>
          {FILL_KEYS.map((k) => (
            <linearGradient key={k} id={`fill-${k}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" style={{ stopColor: tint(k === 'none' ? null : k, k === 'none' ? 12 : 16) }} />
              <stop offset="100%" style={{ stopColor: tint(k === 'none' ? null : k, k === 'none' ? 30 : 34) }} />
            </linearGradient>
          ))}
          <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={dark ? '#2c323a' : '#e2d2b8'} />
            <stop offset="100%" stopColor={dark ? '#15181c' : '#b99f7a'} />
          </linearGradient>
          <filter id="pop" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="10" stdDeviation="7" floodColor="#1a1208" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* ground shadow + side wall (stacked copies of the outline) */}
        <path d={geo.outline} transform={`translate(0,${DEPTH + 10})`} fill="#000" opacity={0.12} style={{ filter: 'blur(10px)' }} />
        {Array.from({ length: DEPTH }, (_, k) => (
          <path key={k} d={geo.outline} transform={`translate(0,${DEPTH - k})`} fill="url(#wall)" />
        ))}

        {/* states tinted by monitoring band; only a faint seam separates them */}
        <g stroke="var(--surface)" strokeOpacity={0.7} strokeWidth={0.8} strokeLinejoin="round">
          {geo.states.map((s) => (
            <path key={s.i} d={s.d} fill={fillOf(s.i)} opacity={popped && popped.i === s.i ? 0.35 : 1}>
              <title>{s.name}</title>
            </path>
          ))}
        </g>

        {/* proximity graph */}
        {showEdges &&
          edges.map((e) => {
            const a = pos.get(e.a)
            const b = pos.get(e.b)
            if (!a || !b) return null
            const hot = hotIds.has(e.a) && hotIds.has(e.b) && compOf.get(e.a) === compOf.get(e.b)
            return (
              <line
                key={e.a + e.b}
                x1={a[0]}
                y1={a[1]}
                x2={b[0]}
                y2={b[1]}
                stroke={hot ? 'var(--band-heat)' : 'var(--ink)'}
                strokeWidth={hot ? 3.2 : 1}
                strokeDasharray={hot ? undefined : '3 4'}
                strokeLinecap="round"
                opacity={hot ? 0.85 : 0.35}
              />
            )
          })}

        {/* hovered city's state pops out of the plate */}
        {popped && (
          <g key={popped.i} className="state-pop" filter="url(#pop)" pointerEvents="none">
            {Array.from({ length: DEPTH }, (_, k) => (
              <path key={k} d={popped.d} transform={`translate(0,${DEPTH - k - LIFT})`} fill="url(#wall)" />
            ))}
            <path d={popped.d} transform={`translate(0,${-LIFT})`} fill={fillOf(popped.i)} />
          </g>
        )}

        {stations.filter((s) => s.id !== hover).map((s) => marker(s, false))}
        {hover && stations.filter((s) => s.id === hover).map((s) => marker(s, true))}
      </svg>

      {popped && (
        <div className="pointer-events-none absolute top-3 left-3 rounded-xl border border-line bg-surface/95 px-3 py-1.5 text-[12.5px] font-semibold shadow-lift backdrop-blur">
          {popped.name}
        </div>
      )}

      <MapLegend showEdges={showEdges} />
    </div>
  )
}

export function MapLegend({ showEdges = true }: { showEdges?: boolean }) {
  return (
    <div className="absolute top-2 right-2 rounded-xl border border-line bg-surface/90 p-2.5 text-[11.5px] backdrop-blur" aria-label="Legend">
      <div className="mb-1 font-semibold text-ink-2">Monitoring band (illustrative)</div>
      <ul className="space-y-0.5">
        {BAND_ORDER.slice()
          .reverse()
          .map((b) => (
            <li key={b} className="flex items-center gap-2 text-ink-2">
              <span className="grid size-3.5 place-items-center rounded-full text-[7px] text-white" style={{ background: BAND_META[b].varName }}>
                {b === 'severe' ? '!' : ''}
              </span>
              {BAND_META[b].label}
            </li>
          ))}
      </ul>
      {showEdges && (
        <div className="mt-1.5 flex items-center gap-2 border-t border-line pt-1.5 text-ink-3">
          <svg width="22" height="6" aria-hidden>
            <line x1="1" y1="3" x2="21" y2="3" stroke="var(--band-heat)" strokeWidth="3" strokeLinecap="round" />
          </svg>
          Connected hot region (BFS)
        </div>
      )}
    </div>
  )
}
